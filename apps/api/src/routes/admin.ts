/**
 * Admin routes — protected by ADMIN_PASSWORD env var.
 * Never expose this to the client. Access via /api/admin/*
 */

import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../lib/db.js";

const router = Router();

function adminAuth(req: Request, res: Response, next: () => void) {
  const password = req.headers["x-admin-password"] as string;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return res.status(503).json({ error: "Admin not configured — set ADMIN_PASSWORD env var" });
  }

  // Constant-time comparison to prevent timing attacks
  const provided = Buffer.from(password ?? "");
  const expected = Buffer.from(adminPassword);
  if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

// GET /api/admin/stats
router.get("/stats", adminAuth, async (_req: Request, res: Response) => {
  try {
    const [
      totalUsers,
      totalSearches,
      billingAgg,
      recentUsers,
      recentSearches,
      creditTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.request.count({ where: { status: "completed" } }),
      prisma.billing.aggregate({ _sum: { totalSpent: true, credits: true } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { billing: { select: { plan: true, credits: true, totalSpent: true, totalSearches: true } } },
      }),
      prisma.request.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { email: true } } },
      }),
      // Revenue by day for last 7 days
      prisma.creditTransaction.findMany({
        where: {
          type: { in: ["purchase", "subscription_grant"] },
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // Group revenue by day
    const revenueMap = new Map<string, { revenue: number; searches: number }>();
    for (const t of creditTransactions) {
      const date = t.createdAt.toISOString().split("T")[0];
      const existing = revenueMap.get(date) ?? { revenue: 0, searches: 0 };
      existing.revenue += t.amountCents / 100;
      revenueMap.set(date, existing);
    }

    // Count searches by day
    const searchesByDay = await prisma.request.groupBy({
      by: ["createdAt"],
      where: {
        status: "completed",
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });
    for (const s of searchesByDay) {
      const date = s.createdAt.toISOString().split("T")[0];
      const existing = revenueMap.get(date) ?? { revenue: 0, searches: 0 };
      existing.searches += 1;
      revenueMap.set(date, existing);
    }

    const revenueByDay = Array.from(revenueMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({
      totalUsers,
      totalSearches,
      totalRevenue: billingAgg._sum.totalSpent ?? 0,
      totalCreditsOutstanding: billingAgg._sum.credits ?? 0,
      recentUsers: recentUsers.map(u => ({
        id: u.id,
        email: u.email,
        plan: u.billing?.plan ?? "none",
        credits: u.billing?.credits ?? 0,
        totalSpent: u.billing?.totalSpent ?? 0,
        totalSearches: u.billing?.totalSearches ?? 0,
        createdAt: u.createdAt,
      })),
      recentSearches,
      revenueByDay,
    });
  } catch (err) {
    console.error("[admin] stats error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/admin/promo — create a promo code
router.post("/promo", adminAuth, async (req: Request, res: Response) => {
  try {
    const { code, credits, maxUses = 1, expiresInDays } = req.body as {
      code?: string;
      credits: number;
      maxUses?: number;
      expiresInDays?: number;
    };

    if (!credits || credits < 1) {
      return res.status(400).json({ error: "credits must be >= 1" });
    }

    // Auto-generate code if not provided
    const finalCode = code?.trim().toUpperCase() ||
      `UNCOVER-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const promo = await prisma.promoCode.create({
      data: {
        code: finalCode,
        credits,
        maxUses,
        expiresAt: expiresAt ?? undefined,
      },
    });

    return res.status(201).json({
      code: promo.code,
      credits: promo.credits,
      maxUses: promo.maxUses,
      expiresAt: promo.expiresAt,
    });
  } catch (err: any) {
    if (err.code === "P2002") {
      return res.status(409).json({ error: "Code already exists" });
    }
    console.error("[admin] promo error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/admin/promos — list all promo codes
router.get("/promos", adminAuth, async (_req: Request, res: Response) => {
  try {
    const promos = await prisma.promoCode.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { redemptions: true } } },
    });
    return res.json({ promos: promos.map(p => ({ ...p, usedCount: p._count.redemptions })) });
  } catch (err) {
    console.error("[admin] promos error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
