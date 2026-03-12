import { Request, Response, NextFunction } from "express";
import crypto from "crypto";
import prisma from "../lib/db.js";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  apiKeyId?: string;
}

// Hash API key for comparison
function hashKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

// Extract and validate API key from Authorization header
export async function apiKeyAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing or invalid API key" });
    }

    const key = authHeader.substring(7); // Remove "Bearer " prefix

    if (!key) {
      return res.status(401).json({ error: "Invalid API key format" });
    }

    // Hash the provided key to match stored hashed version
    const hashedKey = hashKey(key);

    // Find the API key in database
    const apiKey = await prisma.apiKey.findUnique({
      where: { key: hashedKey },
      include: { user: true },
    });

    if (!apiKey) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    });

    // Attach user and API key info to request
    req.userId = apiKey.userId;
    req.apiKeyId = apiKey.id;

    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

// Helper to generate a new API key
export function generateApiKey(): string {
  return `sk_live_${crypto.randomBytes(32).toString("hex")}`;
}

// Helper to hash a key
export { hashKey };
