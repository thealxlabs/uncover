/**
 * Stripe payment routes
 * - POST /api/billing/checkout  → create Stripe Checkout session
 * - POST /api/billing/portal    → create Customer Portal session
 * - POST /api/billing/webhook   → handle Stripe webhooks
 * - GET  /api/billing/status    → get current plan & usage
 */

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/db.js";
import { apiKeyAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia",
});

const PLANS: Record<string, { priceId: string; name: string; monthlyLimit: number; price: number }> = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID ?? "",
    name: "Pro",
    monthlyLimit: 500,
    price: 29,
  },
  enterprise: {
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
    name: "Enterprise",
    monthlyLimit: 10000,
    price: 199,
  },
};

// GET /api/billing/status — get current billing status
router.get("/status", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billing = await prisma.billing.findUnique({
      where: { userId: req.userId! },
    });
    if (!billing) return res.status(404).json({ error: "Billing not found" });

    return res.json({
      plan: billing.plan,
      monthlyUsage: billing.monthlyUsage,
      monthlyLimit: billing.monthlyLimit,
      stripeCustomerId: billing.stripeId ?? null,
      percentUsed: Math.round((billing.monthlyUsage / billing.monthlyLimit) * 100),
    });
  } catch (err) {
    console.error("[billing] status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/billing/checkout — create Stripe Checkout session
router.post("/checkout", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body as { plan: string };
    const planConfig = PLANS[plan];
    if (!planConfig) return res.status(400).json({ error: "Invalid plan" });
    if (!planConfig.priceId) return res.status(500).json({ error: "Stripe price ID not configured" });

    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) return res.status(404).json({ error: "User not found" });

    const billing = await prisma.billing.findUnique({ where: { userId: req.userId! } });

    // Reuse existing Stripe customer or create new one
    let customerId = billing?.stripeId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name ?? undefined,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.billing.update({
        where: { userId: req.userId! },
        data: { stripeId: customerId },
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard?upgrade=success`,
      cancel_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/pricing`,
      metadata: { userId: user.id, plan },
      subscription_data: { metadata: { userId: user.id, plan } },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[billing] checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// POST /api/billing/portal — create Customer Portal session
router.post("/portal", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billing = await prisma.billing.findUnique({ where: { userId: req.userId! } });
    if (!billing?.stripeId) {
      return res.status(400).json({ error: "No Stripe customer found — subscribe first" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeId,
      return_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("[billing] portal error:", err);
    return res.status(500).json({ error: "Failed to create portal session" });
  }
});

// POST /api/billing/webhook — Stripe webhook handler
// Must be registered BEFORE express.json() in app to receive raw body
router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
  } catch (err: any) {
    console.error("[billing] webhook signature error:", err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, plan } = session.metadata ?? {};
        if (!userId || !plan) break;

        const planConfig = PLANS[plan];
        if (!planConfig) break;

        await prisma.billing.update({
          where: { userId },
          data: {
            plan,
            monthlyLimit: planConfig.monthlyLimit,
            stripeId: session.customer as string,
          },
        });
        console.log(`[billing] upgraded userId=${userId} to plan=${plan}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        // Downgrade to free
        await prisma.billing.update({
          where: { userId },
          data: { plan: "free", monthlyLimit: 10 },
        });
        console.log(`[billing] subscription cancelled userId=${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[billing] payment failed for customer=${invoice.customer}`);
        // TODO: send email notification
        break;
      }

      default:
        console.log(`[billing] unhandled event: ${event.type}`);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[billing] webhook handler error:", err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
});

export default router;
