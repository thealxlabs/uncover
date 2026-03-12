import type { ScrapedPost } from "./scraper.js";

export interface AnalyzedResult {
  problems: Array<{
    text: string;
    frequency: number;
    sentiment: string;
  }>;
  summary: string;
  trends: string[];
}

// Supports Groq, OpenRouter, or any OpenAI-compatible API
const AI_PROVIDER = process.env.AI_PROVIDER || "groq";
const AI_API_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "llama-3.1-8b-instant";

const BASE_URLS: Record<string, string> = {
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1",
};

async function callAI(prompt: string): Promise<string> {
  const baseUrl = BASE_URLS[AI_PROVIDER] ?? BASE_URLS.groq;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AI_API_KEY}`,
  };

  // OpenRouter needs extra headers
  if (AI_PROVIDER === "openrouter") {
    headers["HTTP-Referer"] = "https://uncover.dev";
    headers["X-Title"] = "Uncover API";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1024,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI API error (${response.status}): ${err}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  return data.choices[0]?.message?.content ?? "";
}

export async function analyzeProblems(
  posts: ScrapedPost[],
  topic: string
): Promise<AnalyzedResult> {
  if (posts.length === 0) {
    return { problems: [], summary: "No posts found to analyze", trends: [] };
  }

  const postsText = posts
    .map(
      (p, i) =>
        `Post ${i + 1} (${p.source}, ${p.upvotes} upvotes):\n${p.title}\n${p.text}`
    )
    .join("\n\n---\n\n");

  const prompt = `Analyze these social media posts about "${topic}" and extract the main problems people mention.

Posts:
${postsText}

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "problems": [
    { "text": "specific problem", "frequency": 7, "sentiment": "frustrated" }
  ],
  "summary": "2-3 sentence summary of main issues",
  "trends": ["trend1", "trend2", "trend3"]
}

Extract 5-10 distinct problems. frequency is 1-10. sentiment is one of: frustrated, confused, disappointed, neutral.`;

  try {
    const responseText = await callAI(prompt);

    // Strip markdown code fences if present
    const cleaned = responseText
      .replace(/^```json\s*/m, "")
      .replace(/^```\s*/m, "")
      .replace(/```\s*$/m, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in AI response");

    return JSON.parse(jsonMatch[0]) as AnalyzedResult;
  } catch (error) {
    console.error("AI analysis error:", error);
    throw error;
  }
}
