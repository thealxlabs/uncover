import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../lib/db.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  apiKeyId?: string;
}

function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid API key" });
    }

    const key = authHeader.substring(7);
    if (!key) {
      return res.status(401).json({ error: "Invalid API key format" });
    }

    const hashedKey = hashKey(key);

    const apiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: { user: true },
    });

    if (!apiKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    req.userId = apiKey.userId;
    req.apiKeyId = apiKey.id;

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

export function generateApiKey(): string {
  return `sk_live_${crypto.randomBytes(32).toString("hex")}`;
}

export { hashKey };
