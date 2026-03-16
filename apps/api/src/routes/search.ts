import { Router, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import prisma from "../lib/db.js";
import { scrapeMultipleSources, type Source, type ScrapeOptions } from "../services/scraper.js";
import { scrapeCustomUrls } from "../services/customScraper.js";
import { analyzeProblems } from "../services/analyzer.js";
import { calculateCreditCost, checkQuerySafety, sanitizeQuery } from "../lib/credits.js";
import { getCacheKey, getCached, setCached } from "../lib/cache.js";

const router = Router();

const SearchRequestSchema = z.object({
  query: z.string().min(3, "Query must be at least 3 characters").max(200),
  sources: z.array(z.enum(["reddit", "twitter", "hackernews"])).min(1).default(["reddit"]).optional(),
  urls: z.array(z.string().url()).min(1).max(5).optional(),
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
    } catch (error: any) {
      const msg = error?.errors?.[0]?.message ?? "Invalid request parameters";
      return res.status(400).json({ error: msg });
    }

    const isCustom = !!(searchReq.urls && searchReq.urls.length > 0);

    // Mutual exclusion check
    if (isCustom && searchReq.sources && searchReq.sources.length > 0) {
      return res.status(400).json({ error: "Cannot use both 'sources' and 'urls' in the same request" });
    }
    if (!isCustom && (!searchReq.sources || searchReq.sources.length === 0)) {
      return res.status(400).json({ error: "Either 'sources' or 'urls' must be provided" });
    }

    // Content safety check
    const safetyCheck = checkQuerySafety(searchReq.query);
    if (!safetyCheck.allowed) {
      return res.status(400).json({ error: safetyCheck.reason });
    }

    // Sanitize query
    const query = sanitizeQuery(searchReq.query);

    // Calculate dynamic credit cost
    const creditCost = calculateCreditCost({
      sources: searchReq.sources,
      urls: searchReq.urls,
      limit: searchReq.limit,
      options: searchReq.options,
    });

    // Check credits
    const billing = await prisma.billing.findUnique({ where: { userId: req.userId } });
    if (!billing) return res.status(500).json({ error: "Billing info not found" });

    if (billing.credits < creditCost) {
      return res.status(402).json({
        error: "Insufficient credits",
        credits: billing.credits,
        required: creditCost,
        message: `This search costs ${creditCost} credit${creditCost > 1 ? "s" : ""}. You have ${billing.credits}.`,
        buyUrl: "/api/billing/checkout",
      });
    }

    // Check cache for identical recent search (saves credits)
    const cacheKey = getCacheKey(query, isCustom ? ["custom"] : searchReq.sources!, searchReq.limit, searchReq.options);
    const cached = getCached(cacheKey);

    if (cached) {
      console.log(`[search] cache hit for "${query}"`);
      // Still log the request but don't charge credits
      const request = await prisma.request.create({
        data: {
          userId: req.userId,
          query,
          sources: JSON.stringify(isCustom ? ["custom"] : searchReq.sources),
          limit: searchReq.limit,
          status: "completed",
          cost: 0, // cached — no charge
        },
      });

      await prisma.result.create({
        data: {
          requestId: request.id,
          rawData: JSON.stringify(cached.posts),
          problems: JSON.stringify(cached.analysis.problems),
          summary: cached.analysis.summary,
          trends: JSON.stringify(cached.analysis.trends),
        },
      });

      return res.status(200).json({
        requestId: request.id,
        status: "completed",
        query,
        sources: isCustom ? ["custom"] : searchReq.sources,
        postsAnalyzed: cached.posts.length,
        ...cached.analysis,
        cost: 0,
        creditsUsed: 0,
        cached: true,
        credits: { remaining: billing.credits },
      });
    }

    // Create request record
    const request = await prisma.request.create({
      data: {
        userId: req.userId,
        query,
        sources: JSON.stringify(isCustom ? ["custom"] : searchReq.sources),
        limit: searchReq.limit,
        status: "pending",
      },
    });

    try {
      await prisma.request.update({ where: { id: request.id }, data: { status: "processing" } });

      let posts;
      if (isCustom) {
        posts = await scrapeCustomUrls(searchReq.urls!, { urls: searchReq.urls! });
      } else {
        const scrapeOpts: ScrapeOptions = {
          excludeSubreddits: searchReq.options?.excludeSubreddits,
          excludeKeywords: searchReq.options?.excludeKeywords,
          minUpvotes: searchReq.options?.minUpvotes,
          maxAgeHours: searchReq.options?.maxAgeHours,
        };
        posts = await scrapeMultipleSources(
          query,
          searchReq.sources as Source[],
          searchReq.limit,
          scrapeOpts
        );
      }

      const analysis = await analyzeProblems(posts, query);

      // Cache the result
      setCached(cacheKey, posts, analysis);

      await prisma.result.create({
        data: {
          requestId: request.id,
          rawData: JSON.stringify(posts),
          problems: JSON.stringify(analysis.problems),
          summary: analysis.summary,
          trends: JSON.stringify(analysis.trends),
        },
      });

      // Deduct credits atomically
      await prisma.$transaction([
        prisma.request.update({
          where: { id: request.id },
          data: { status: "completed", cost: creditCost * 0.05 },
        }),
        prisma.billing.update({
          where: { userId: req.userId },
          data: {
            credits: { decrement: creditCost },
            totalSearches: { increment: 1 },
            totalSpent: { increment: creditCost * 0.05 },
          },
        }),
        prisma.creditTransaction.create({
          data: {
            userId: req.userId,
            type: "spend",
            credits: -creditCost,
            amountCents: 0,
            description: isCustom
              ? `Custom URL search (${creditCost}cr): "${query.slice(0, 50)}"`
              : `Search (${creditCost}cr): "${query.slice(0, 50)}"`,
          },
        }),
      ]);

      const updatedBilling = await prisma.billing.findUnique({ where: { userId: req.userId } });

      return res.status(200).json({
        requestId: request.id,
        status: "completed",
        query,
        sources: isCustom ? ["custom"] : searchReq.sources,
        urls: isCustom ? searchReq.urls : undefined,
        postsAnalyzed: posts.length,
        ...analysis,
        cost: creditCost * 0.05,
        creditsUsed: creditCost,
        cached: false,
        credits: { remaining: updatedBilling?.credits ?? 0 },
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

// GET /api/search/history
router.get("/history", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
    const limit = Math.min(parseInt((req.query.limit as string) || "10", 10), 50);
    const requests = await prisma.request.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: { id: true, query: true, sources: true, status: true, cost: true, createdAt: true },
    });
    return res.json({ requests: requests.map(r => ({ ...r, sources: JSON.parse(r.sources) })) });
  } catch (error) {
    console.error("[search] history error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/search/:requestId
router.get("/:requestId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) return res.status(401).json({ error: "Unauthorized" });
    const request = await prisma.request.findUnique({ where: { id: req.params.requestId }, include: { result: true } });
    if (!request) return res.status(404).json({ error: "Request not found" });
    if (request.userId !== req.userId) return res.status(403).json({ error: "Forbidden" });
    return res.status(200).json({
      requestId: request.id, status: request.status, query: request.query,
      sources: JSON.parse(request.sources), cost: request.cost, createdAt: request.createdAt,
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

// GET /api/search/cost — preview cost before running
router.post("/cost", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sources, urls, limit, options } = req.body;
    const cost = calculateCreditCost({ sources, urls, limit: limit ?? 20, options });
    return res.json({ credits: cost });
  } catch {
    return res.json({ credits: 1 });
  }
});

export default router;
