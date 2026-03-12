import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import prisma from "../lib/db.js";
import { generateApiKey, hashKey } from "../middleware/auth.js";

const router = Router();

// Validation schemas
const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

type SignupRequest = z.infer<typeof SignupSchema>;
type SigninRequest = z.infer<typeof SigninSchema>;

// POST /api/auth/signup
router.post("/signup", async (req: Request, res: Response) => {
  try {
    let data: SignupRequest;
    try {
      data = SignupSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request", details: error });
    }

    // Check if user exists
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        billing: {
          create: {
            plan: "free",
            monthlyUsage: 0,
            monthlyLimit: 10,
          },
        },
      },
    });

    // Generate initial API key
    const rawKey = generateApiKey();
    const hashedKey = hashKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        key: hashedKey,
        name: "Default Key",
      },
    });

    return res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      apiKey: {
        id: apiKey.id,
        key: rawKey, // Only shown once at creation
        name: apiKey.name,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/signin
router.post("/signin", async (req: Request, res: Response) => {
  try {
    let data: SigninRequest;
    try {
      data = SigninSchema.parse(req.body);
    } catch (error) {
      return res.status(400).json({ error: "Invalid request", details: error });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Compare password
    const valid = await bcrypt.compare(data.password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Get user's API keys
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, createdAt: true },
    });

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      apiKeys,
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
