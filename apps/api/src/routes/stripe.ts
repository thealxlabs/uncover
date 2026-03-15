/**
 * Stripe billing — Hybrid model
 *
 * PAYG Credit Packs (one-time):
 *   starter  — 50 searches   — $5
 *   growth   — 200 searches  — $15
 *   pro_pack — 500 searches  — $29
 *   scale    — 2000 searches — $79
 *
 * Subscriptions (recurring, reset credits monthly):
 *   builder     — 300/mo  — $19/mo
 *   team        — 1000/mo — $49/mo
 *   enterprise  — 5000/mo — $149/mo
 *
 * Credit rules:
 * - PAYG top-ups add to the pool, never expire
 * - Subscribers get credits added each billing cycle (they don't reset — they accumulate)
 * - Cancelling a subscription downgrades to payg, keeps remaining credits
 */

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../lib/db.js";
import { apiKeyAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2024-11-20.acacia" as any,
});

// ── PAYG Packs ───────────────────────────────────────────────────────────────

export const CREDIT_PACKS: Record<string, {
  name: string;
  credits: number;
  amountCents: number;
  priceId: string;
}> = {
  starter: {
    name: "Starter Pack",
    credits: 50,
    amountCents: 500,
    priceId: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  },
  growth: {
    name: "Growth Pack",
    credits: 200,
    amountCents: 1500,
    priceId: process.env.STRIPE_GROWTH_PRICE_ID ?? "",
  },
  pro_pack: {
    name: "Pro Pack",
    credits: 500,
    amountCents: 2900,
    priceId: process.env.STRIPE_PRO_PACK_PRICE_ID ?? "",
  },
  scale: {
    name: "Scale Pack",
    credits: 2000,
    amountCents: 7900,
    priceId: process.env.STRIPE_SCALE_PRICE_ID ?? "",
  },
};

// ── Subscriptions ────────────────────────────────────────────────────────────

export const SUBSCRIPTION_PLANS: Record<string, {
  name: string;
  creditsPerCycle: number;
  amountCents: number;
  priceId: string;
}> = {
  builder: {
    name: "Builder",
    creditsPerCycle: 300,
    amountCents: 1900,
    priceId: process.env.STRIPE_BUILDER_PRICE_ID ?? "",
  },
  team: {
    name: "Team",
    creditsPerCycle: 1000,
    amountCents: 4900,
    priceId: process.env.STRIPE_TEAM_PRICE_ID ?? "",
  },
  enterprise: {
    name: "Enterprise",
    creditsPerCycle: 5000,
    amountCents: 14900,
    priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
  },
};

// ── GET /api/billing/status ──────────────────────────────────────────────────

router.get("/status", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billing = await prisma.billing.findUnique({ where: { userId: req.userId! } });
    if (!billing) return res.status(404).json({ error: "Billing not found" });

    const transactions = await prisma.creditTransaction.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    const isSubscriber = !!billing.stripeSubId;

    return res.json({
      plan: billing.plan,
      credits: billing.credits,
      totalSpent: billing.totalSpent,
      totalSearches: billing.totalSearches,
      isSubscriber,
      subscription: isSubscriber
        ? {
            creditsPerCycle: billing.subCreditsPerCycle,
            resetAt: billing.subResetAt,
          }
        : null,
      packs: Object.entries(CREDIT_PACKS).map(([key, p]) => ({
        key,
        name: p.name,
        credits: p.credits,
        price: `$${(p.amountCents / 100).toFixed(2)}`,
        perSearch: `$${(p.amountCents / p.credits / 100).toFixed(3)}`,
      })),
      subscriptionPlans: Object.entries(SUBSCRIPTION_PLANS).map(([key, p]) => ({
        key,
        name: p.name,
        creditsPerCycle: p.creditsPerCycle,
        price: `$${(p.amountCents / 100).toFixed(0)}/mo`,
        perSearch: `$${(p.amountCents / p.creditsPerCycle / 100).toFixed(3)}`,
      })),
      recentTransactions: transactions,
    });
  } catch (err) {
    console.error("[billing] status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/billing/checkout — PAYG pack (one-time) ───────────────────────

router.post("/checkout", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { pack } = req.body as { pack: string };
    const packConfig = CREDIT_PACKS[pack];
    if (!packConfig) {
      return res.status(400).json({ error: "Invalid pack", validPacks: Object.keys(CREDIT_PACKS) });
    }
    if (!packConfig.priceId) {
      return res.status(500).json({ error: `Price ID not configured for pack: ${pack}. Set STRIPE_${pack.toUpperCase()}_PRICE_ID in .env` });
    }

    const customerId = await getOrCreateCustomer(req.userId!);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      line_items: [{ price: packConfig.priceId, quantity: 1 }],
      success_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard?bought=pack&pack=${pack}`,
      cancel_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard?bought=cancelled`,
      metadata: {
        userId: req.userId!,
        type: "pack",
        pack,
        credits: String(packConfig.credits),
      },
    });

    return res.json({ url: session.url, sessionId: session.id, pack: packConfig });
  } catch (err) {
    console.error("[billing] checkout error:", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// ── POST /api/billing/subscribe — start a subscription ──────────────────────

router.post("/subscribe", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { plan } = req.body as { plan: string };
    const planConfig = SUBSCRIPTION_PLANS[plan];
    if (!planConfig) {
      return res.status(400).json({ error: "Invalid plan", validPlans: Object.keys(SUBSCRIPTION_PLANS) });
    }
    if (!planConfig.priceId) {
      return res.status(500).json({ error: `Price ID not configured for plan: ${plan}. Set STRIPE_${plan.toUpperCase()}_PRICE_ID in .env` });
    }

    const billing = await prisma.billing.findUnique({ where: { userId: req.userId! } });

    // Already subscribed — redirect to portal to change plan
    if (billing?.stripeSubId) {
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: billing.stripeId!,
        return_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard`,
      });
      return res.json({ url: portalSession.url, message: "Redirecting to portal to change plan" });
    }

    const customerId = await getOrCreateCustomer(req.userId!);

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard?bought=sub&plan=${plan}`,
      cancel_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard?bought=cancelled`,
      metadata: { userId: req.userId!, type: "subscription", plan },
      subscription_data: {
        metadata: { userId: req.userId!, plan },
      },
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("[billing] subscribe error:", err);
    return res.status(500).json({ error: "Failed to create subscription session" });
  }
});

// ── POST /api/billing/portal — manage subscription ──────────────────────────

router.post("/portal", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const billing = await prisma.billing.findUnique({ where: { userId: req.userId! } });
    if (!billing?.stripeId) {
      return res.status(400).json({ error: "No billing history — make a purchase first" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripeId,
      return_url: `${process.env.WEB_URL ?? "http://localhost:3000"}/dashboard`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("[billing] portal error:", err);
    return res.status(500).json({ error: "Failed to open billing portal" });
  }
});

// ── POST /api/billing/webhook ────────────────────────────────────────────────

router.post("/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body as Buffer,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET ?? ""
    );
  } catch (err: any) {
    console.error("[billing] webhook sig error:", err.message);
    return res.status(400).json({ error: err.message });
  }

  try {
    switch (event.type) {

      // ── One-time pack purchase completed ──────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { userId, type, pack, credits, plan } = session.metadata ?? {};
        if (!userId) break;

        if (type === "pack" && pack && credits) {
          const creditsNum = parseInt(credits, 10);
          const packConfig = CREDIT_PACKS[pack];
          if (!packConfig) break;

          const currentBilling = await prisma.billing.findUnique({ where: { userId } });
          // Upgrade free users to payg on first purchase; keep existing plan otherwise
          const newPlan = !currentBilling || currentBilling.plan === "free" ? "payg" : currentBilling.plan;

          await prisma.$transaction([
            prisma.billing.update({
              where: { userId },
              data: {
                credits: { increment: creditsNum },
                totalSpent: { increment: packConfig.amountCents / 100 },
                stripeId: session.customer as string,
                plan: newPlan,
              },
            }),
            prisma.creditTransaction.create({
              data: {
                userId,
                type: "purchase",
                credits: creditsNum,
                amountCents: packConfig.amountCents,
                description: `Purchased ${packConfig.name} (${creditsNum} searches)`,
                stripeId: session.id,
              },
            }),
          ]);

          console.log(`[billing] +${creditsNum} credits (pack=${pack}) userId=${userId}`);
        }

        // Subscription checkout — wait for invoice.paid for the credit grant
        if (type === "subscription" && plan) {
          await prisma.billing.update({
            where: { userId },
            data: { stripeId: session.customer as string },
          });
        }
        break;
      }

      // ── Subscription invoice paid — grant monthly credits ─────────────────
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const sub = invoice.subscription
          ? await stripe.subscriptions.retrieve(invoice.subscription as string)
          : null;
        if (!sub) break;

        const userId = sub.metadata?.userId;
        const plan = sub.metadata?.plan;
        if (!userId || !plan) break;

        const planConfig = SUBSCRIPTION_PLANS[plan];
        if (!planConfig) break;

        const resetAt = new Date(sub.current_period_end * 1000);

        await prisma.$transaction([
          prisma.billing.update({
            where: { userId },
            data: {
              plan,
              stripeSubId: sub.id,
              credits: { increment: planConfig.creditsPerCycle },
              totalSpent: { increment: planConfig.amountCents / 100 },
              subCreditsPerCycle: planConfig.creditsPerCycle,
              subResetAt: resetAt,
            },
          }),
          prisma.creditTransaction.create({
            data: {
              userId,
              type: "subscription_grant",
              credits: planConfig.creditsPerCycle,
              amountCents: planConfig.amountCents,
              description: `${planConfig.name} plan — ${planConfig.creditsPerCycle} credits for billing cycle`,
              stripeId: invoice.id,
            },
          }),
        ]);

        console.log(`[billing] +${planConfig.creditsPerCycle} credits (sub=${plan}) userId=${userId}`);
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        if (!userId) break;

        await prisma.billing.update({
          where: { userId },
          data: {
            plan: "payg",       // downgrade — keep remaining credits
            stripeSubId: null,
            subCreditsPerCycle: null,
            subResetAt: null,
          },
        });

        console.log(`[billing] subscription cancelled userId=${userId} — downgraded to payg`);
        break;
      }

      // ── Payment failed ────────────────────────────────────────────────────
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[billing] payment failed customer=${invoice.customer} invoice=${invoice.id}`);
        // TODO: send notification email to user
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[billing] webhook handler error:", err);
    return res.status(500).json({ error: "Handler failed" });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getOrCreateCustomer(userId: string): Promise<string> {
  const billing = await prisma.billing.findUnique({ where: { userId } });
  if (billing?.stripeId) return billing.stripeId;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  const customer = await stripe.customers.create({
    email: user?.email,
    name: user?.name ?? undefined,
    metadata: { userId },
  });

  await prisma.billing.update({
    where: { userId },
    data: { stripeId: customer.id },
  });

  return customer.id;
}

export default router;
