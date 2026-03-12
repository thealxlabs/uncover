import { Router, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import prisma from "../lib/db.js";
import { scrapeMultipleSources, type Source, type ScrapeOptions } from "../services/scraper.js";
import { analyzeProblems } from "../services/analyzer.js";

const router = Router();

const COST_PER_SEARCH_CENTS = 5; // $0.05

const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  sources: z.array(z.enum(["reddit", "twitter", "hackernews"])).min(1).default(["reddit"]),
  limit: z.number().int().min(1).max(50).default(20),
  options: z.object({
    excludeSubreddits: z.array(z.string()).optional(),
    excludeKeywords: z.array(z.string()).optional(),
    minUpvotes: z.number().int().min(0).optional(),
    maxAgeHours: z.number().int().min(1).optional(),
  }).optional(),
});

// POST /api/search
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

    let searchReq: z.infer<typeof SearchRequestSchema>;
    try {
      searchReq = SearchRequestSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request parameters", details: error });
    }

    // Check credits
    const billing = await prisma.billing.findUnique({ where: { userId: req.userId } });
    if (!billing) return res.status(500).json({ error: "Billing info not found" });

    if (billing.credits < 1) {
      return res.status(402).json({
        error: "Insufficient credits",
        credits: billing.credits,
        message: "Purchase a credit pack to continue searching.",
        buyUrl: "/api/billing/checkout",
      });
    }

    const request = await prisma.request.create({
      data: {
        userId: req.userId,
        query: searchReq.query,
        sources: JSON.stringify(searchReq.sources),
        limit: searchReq.limit,
        status: "pending",
      },
    });

    try {
      await prisma.request.update({ where: { id: request.id }, data: { status: "processing" } });

      const scrapeOpts: ScrapeOptions = {
        excludeSubreddits: searchReq.options?.excludeSubreddits,
        excludeKeywords: searchReq.options?.excludeKeywords,
        minUpvotes: searchReq.options?.minUpvotes,
        maxAgeHours: searchReq.options?.maxAgeHours,
      };

      const posts = await scrapeMultipleSources(
        searchReq.query,
        searchReq.sources as Source[],
        searchReq.limit,
        scrapeOpts
      );

      const analysis = await analyzeProblems(posts, searchReq.query);

      await prisma.result.create({
        data: {
          requestId: request.id,
          rawData: JSON.stringify(posts),
          problems: JSON.stringify(analysis.problems),
          summary: analysis.summary,
          trends: JSON.stringify(analysis.trends),
        },
      });

      // Deduct 1 credit atomically
      await prisma.$transaction([
        prisma.request.update({
          where: { id: request.id },
          data: { status: "completed", cost: COST_PER_SEARCH_CENTS / 100 },
        }),
        prisma.billing.update({
          where: { userId: req.userId },
          data: {
            credits: { decrement: 1 },
            monthlyUsage: { increment: 1 },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: req.userId,
            type: "spend",
            credits: -1,
            amountCents: 0,
            description: `Search: "${searchReq.query.slice(0, 60)}"`,
          },
        }),
      ]);

      const updatedBilling = await prisma.billing.findUnique({ where: { userId: req.userId } });

      return res.status(200).json({
        requestId: request.id,
        status: "completed",
        query: searchReq.query,
        sources: searchReq.sources,
        postsAnalyzed: posts.length,
        ...analysis,
        cost: COST_PER_SEARCH_CENTS / 100,
        credits: {
          remaining: updatedBilling?.credits ?? 0,
        },
      });
    } catch (error) {
      await prisma.request.update({ where: { id: request.id }, data: { status: "failed" } });
      console.error("[search] processing error:", error);
      return res.status(500).json({ error: "Failed to process search" });
    }
  } catch (error) {
    console.error("[search] endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/search/:requestId
router.get("/:requestId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

    // Handle "history" as a special sub-path before treating as requestId
    if (req.params.requestId === "history") {
      const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 50);
      const requests = await prisma.request.findMany({
        where: { userId: req.userId },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { id: true, query: true, sources: true, status: true, cost: true, createdAt: true },
      });
      return res.json({ requests: requests.map(r => ({ ...r, sources: JSON.parse(r.sources) })) });
    }

    const request = await prisma.request.findUnique({
      where: { id: req.params.requestId },
      include: { result: true },
    });

    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });

    return res.status(200).json({
      requestId: request.id,
      status: request.status,
      query: request.query,
      sources: JSON.parse(request.sources),
      cost: request.cost,
      createdAt: request.createdAt,
      ...(request.result && {
        problems: JSON.parse(request.result.problems),
        summary: request.result.summary,
        trends: JSON.parse(request.result.trends),
      }),
    });
  } catch (error) {
    console.error("[search] get error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
