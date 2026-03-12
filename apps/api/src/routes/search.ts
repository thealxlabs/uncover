import { Router, Response } from "express";
import { z } from "zod";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import prisma from "../lib/db.js";
import { scrapeMultipleSources } from "../services/scraper.js";
import { analyzeProblems } from "../services/analyzer.js";

const router = Router();

// Validation schema for search request
const SearchRequestSchema = z.object({
  query: z.string().min(1).max(200),
  sources: z.array(z.enum(["reddit", "twitter"])).min(1),
  limit: z.number().int().min(1).max(50).default(20),
});

type SearchRequest = z.infer<typeof SearchRequestSchema>;

// POST /api/search - Submit a search request
router.post("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Validate request body
    let searchReq: SearchRequest;
    try {
      searchReq = SearchRequestSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request parameters", details: error });
    }

    // Check user's billing/usage limits
    const billing = await prisma.billing.findUnique({
      where: { userId: req.userId },
    });

    if (!billing) {
      return res.status(500).json({ error: "Billing info not found" });
    }

    if (billing.monthlyUsage >= billing.monthlyLimit) {
      return res.status(429).json({
        error: "Monthly request limit exceeded",
        limit: billing.monthlyLimit,
        used: billing.monthlyUsage,
      });
    }

    // Create request record in database
    const request = await prisma.request.create({
      data: {
        userId: req.userId,
        query: searchReq.query,
        sources: JSON.stringify(searchReq.sources),
        limit: searchReq.limit,
        status: "pending",
      },
    });

    // For MVP, process synchronously (later: queue with Bull)
    try {
      // Update status to processing
      await prisma.request.update({
        where: { id: request.id },
        data: { status: "processing" },
      });

      // Scrape data from sources
      const posts = await scrapeMultipleSources(
        searchReq.query,
        searchReq.sources as ("reddit" | "twitter")[],
        searchReq.limit
      );

      // Analyze with Claude
      const analysis = await analyzeProblems(posts, searchReq.query);

      // Store results
      await prisma.result.create({
        data: {
          requestId: request.id,
          rawData: JSON.stringify(posts),
          problems: JSON.stringify(analysis.problems),
          summary: analysis.summary,
          trends: JSON.stringify(analysis.trends),
        },
      });

      // Update request status
      await prisma.request.update({
        where: { id: request.id },
        data: {
          status: "completed",
          cost: 0.01, // MVP: fixed cost, later calculate actual
        },
      });

      // Increment monthly usage
      await prisma.billing.update({
        where: { userId: req.userId },
        data: { monthlyUsage: { increment: 1 } },
      });

      // Return results
      return res.status(200).json({
        requestId: request.id,
        status: "completed",
        query: searchReq.query,
        sources: searchReq.sources,
        ...analysis,
        cost: 0.01,
      });
    } catch (error) {
      // If processing fails, update status
      await prisma.request.update({
        where: { id: request.id },
        data: { status: "failed" },
      });

      console.error("Search processing error:", error);
      return res.status(500).json({ error: "Failed to process search" });
    }
  } catch (error) {
    console.error("Search endpoint error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/search/:requestId - Get status/results of a request
router.get("/:requestId", async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const request = await prisma.request.findUnique({
      where: { id: req.params.requestId },
      include: { result: true },
    });

    if (!request) {
      return res.status(404).json({ error: "Request not found" });
    }

    if (request.userId !== req.userId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.status(200).json({
      requestId: request.id,
      status: request.status,
      query: request.query,
      sources: JSON.parse(request.sources),
      createdAt: request.createdAt,
      ...(request.result && {
        problems: JSON.parse(request.result.problems),
        summary: request.result.summary,
        trends: JSON.parse(request.result.trends),
      }),
    });
  } catch (error) {
    console.error("Get request error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
