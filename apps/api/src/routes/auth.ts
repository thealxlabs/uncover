import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/db.js";
import { generateApiKey, hashKey, apiKeyAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();
import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/db.js";
import { generateApiKey, hashKey, apiKeyAuth } from "../middleware/auth.js";
import { sendWelcomeEmail } from "../lib/email.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    let data: z.infer<typeof SignupSchema>;
    try {
      data = SignupSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request", details: error });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        billing: {
          create: {
            plan: "payg",
            credits: 0,
            totalSearches: 0,
          },
        },
      },
    });

    const rawKey = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: { userId: user.id, key: hashKey(rawKey), name: "Default Key" },
    });

    // Send welcome email with API key — fire and forget, don't block response
    sendWelcomeEmail(user.email, rawKey).catch((err) =>
      console.error("[signup] welcome email failed:", err)
    );

    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: { id: apiKey.id, key: rawKey, name: apiKey.name },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/signin
// Note: API keys are hashed — we return the user's key list so they can pick,
// but the raw key is only shown once at signup. This is intentional by design.
router.post("/signin", async (req: Request, res: Response) => {
  try {
    let data: z.infer<typeof SigninSchema>;
    try {
      data = SigninSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request", details: error });
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, createdAt: true, lastUsed: true },
    });

    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKeys,
      // If the user has no keys somehow, they should create one via POST /api/auth/keys
      message: apiKeys.length === 0
        ? "No API keys found. Create one via POST /api/auth/keys."
        : `${apiKeys.length} key(s) found. Use your saved sk_live_ key to authenticate.`,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/keys
router.get("/keys", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.userId! },
      select: { id: true, name: true, createdAt: true, lastUsed: true },
    });
    return res.json({ apiKeys });
  } catch (error) {
    console.error("Keys error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/keys
router.post("/keys", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    const rawKey = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.userId!,
        key: hashKey(rawKey),
        name: name?.trim() || "New Key",
      },
    });
    // Raw key only returned here — store it, it can't be retrieved again
    return res.status(201).json({ id: apiKey.id, key: rawKey, name: apiKey.name });
  } catch (error) {
    console.error("Create key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/auth/keys/:id
router.delete("/keys/:id", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key || key.userId !== req.userId) {
      return res.status(404).json({ error: "Key not found" });
    }
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    return res.json({ deleted: true });
  } catch (error) {
    console.error("Delete key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    let data: z.infer<typeof SignupSchema>;
    try {
      data = SignupSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request", details: error });
    }

    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        billing: {
          create: {
            plan: "payg",
            credits: 0,
            totalSearches: 0,
          },
        },
      },
    });

    const rawKey = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: { userId: user.id, key: hashKey(rawKey), name: "Default Key" },
    });

    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKey: { id: apiKey.id, key: rawKey, name: apiKey.name },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/signin
// Note: API keys are hashed — we return the user's key list so they can pick,
// but the raw key is only shown once at signup. This is intentional by design.
router.post("/signin", async (req: Request, res: Response) => {
  try {
    let data: z.infer<typeof SigninSchema>;
    try {
      data = SigninSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request", details: error });
    }

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, createdAt: true, lastUsed: true },
    });

    return res.status(200).json({
      user: { id: user.id, email: user.email, name: user.name },
      apiKeys,
      // If the user has no keys somehow, they should create one via POST /api/auth/keys
      message: apiKeys.length === 0
        ? "No API keys found. Create one via POST /api/auth/keys."
        : `${apiKeys.length} key(s) found. Use your saved sk_live_ key to authenticate.`,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/keys
router.get("/keys", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: req.userId! },
      select: { id: true, name: true, createdAt: true, lastUsed: true },
    });
    return res.json({ apiKeys });
  } catch (error) {
    console.error("Keys error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/keys
router.post("/keys", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    const rawKey = generateApiKey();
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.userId!,
        key: hashKey(rawKey),
        name: name?.trim() || "New Key",
      },
    });
    // Raw key only returned here — store it, it can't be retrieved again
    return res.status(201).json({ id: apiKey.id, key: rawKey, name: apiKey.name });
  } catch (error) {
    console.error("Create key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/auth/keys/:id
router.delete("/keys/:id", apiKeyAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const key = await prisma.apiKey.findUnique({ where: { id: req.params.id } });
    if (!key || key.userId !== req.userId) {
      return res.status(404).json({ error: "Key not found" });
    }
    await prisma.apiKey.delete({ where: { id: req.params.id } });
    return res.json({ deleted: true });
  } catch (error) {
    console.error("Delete key error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
