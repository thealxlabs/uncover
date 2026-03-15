#!/usr/bin/env node
/**
 * uncover CLI
 *
 * Commands:
 *   uncover login                          — save API key
 *   uncover logout                         — clear saved key
 *   uncover scrape <query>                 — run a search
 *   uncover status                         — show plan & credits
 *   uncover keys                           — list API keys
 *   uncover history                        — recent searches
 */

import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import Conf from "conf";
import * as readline from "readline";

const config = new Conf({ projectName: "uncover-cli" });
const API_BASE = process.env.UNCOVER_API_URL || "https://api.uncover.dev";

const program = new Command();

program
  .name("uncover")
  .description("Surface real problems from social data")
  .version("0.1.1");

// ─── Helpers ────────────────────────────────────────────────────────────────

function getKey(): string {
  const key = config.get("apiKey") as string | undefined;
  if (!key) {
    console.error(chalk.red("Not authenticated. Run: uncover login"));
    process.exit(1);
  }
  return key;
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const key = getKey();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...(options.headers as Record<string, string>),
    },
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(chalk.red(`Error: ${(json as any).error || res.statusText}`));
    process.exit(1);
  }
  return json;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(question, (ans) => { rl.close(); resolve(ans.trim()); }));
}

function promptSecret(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    let input = "";
    process.stdin.on("data", (char) => {
      const c = char.toString();
      if (c === "\r" || c === "\n") {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(input);
      } else if (c === "\u0003") {
        process.exit();
      } else if (c === "\u007F") {
        input = input.slice(0, -1);
      } else {
        input += c;
        process.stdout.write("*");
      }
    });
  });
}

// ─── Commands ────────────────────────────────────────────────────────────────

// uncover login
program
  .command("login")
  .description("Authenticate with your Uncover API key")
  .option("--key <key>", "API key (skip prompt)")
  .action(async (opts) => {
    console.log(chalk.dim("\nUncover — Authentication\n"));

    let key = opts.key as string | undefined;

    if (!key) {
      const input = await prompt("Paste your API key (sk_live_...) or press Enter to verify with email: ");

      if (input.startsWith("sk_live_")) {
        key = input;
      } else {
        const email = input || await prompt("Email: ");
        const password = await promptSecret("Password: ");

        const spinner = ora("Verifying credentials...").start();
        try {
          const res = await fetch(`${API_BASE}/api/auth/signin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });
          const data = await res.json() as any;
          if (!res.ok) { spinner.fail(data.error || "Sign in failed"); process.exit(1); }
          spinner.succeed("Credentials valid");
          console.log(chalk.dim("\nYour API keys (names only — hashed server-side):"));
          (data.apiKeys as any[]).forEach((k: any) => {
            const lastUsed = k.lastUsed
              ? `last used ${new Date(k.lastUsed).toLocaleDateString()}`
              : "never used";
            console.log(`  ${chalk.cyan(k.name)} — ${chalk.dim(lastUsed)}`);
          });
          console.log(chalk.dim("\nNow run: uncover login --key sk_live_YOUR_KEY"));
        } catch {
          spinner.fail("Network error");
          process.exit(1);
        }
        return;
      }
    }

    if (!key.startsWith("sk_live_")) {
      console.error(chalk.red("Invalid key format. Expected: sk_live_..."));
      process.exit(1);
    }

    config.set("apiKey", key);
    console.log(chalk.green("\nAuthenticated successfully."));
    console.log(chalk.dim(`Key saved to ${config.path}\n`));
  });

// uncover logout
program
  .command("logout")
  .description("Remove saved API key")
  .action(() => {
    config.delete("apiKey");
    console.log(chalk.dim("Logged out."));
  });

// uncover scrape
program
  .command("scrape <query>")
  .description("Search social platforms for pain points around a topic")
  .option("--sources <sources>", "Comma-separated: reddit,twitter,hackernews", "reddit")
  .option("--limit <n>", "Number of posts to analyze (1-50)", "20")
  .option("--exclude-subreddits <subs>", "Comma-separated subreddits to skip")
  .option("--exclude-keywords <kws>", "Comma-separated keywords to filter out")
  .option("--min-upvotes <n>", "Minimum upvotes to include a post", "0")
  .option("--max-age <hours>", "Only include posts newer than N hours")
  .option("--json", "Output raw JSON")
  .action(async (query: string, opts) => {
    const spinner = ora(`Searching for "${query}"...`).start();

    const sources = (opts.sources as string).split(",").map((s: string) => s.trim());
    const body: Record<string, any> = {
      query,
      sources,
      limit: Math.min(50, Math.max(1, parseInt(opts.limit, 10))),
      options: {},
    };

    if (opts.excludeSubreddits) {
      body.options.excludeSubreddits = opts.excludeSubreddits.split(",").map((s: string) => s.trim());
    }
    if (opts.excludeKeywords) {
      body.options.excludeKeywords = opts.excludeKeywords.split(",").map((s: string) => s.trim());
    }
    const minUpvotes = parseInt(opts.minUpvotes, 10);
    if (!isNaN(minUpvotes) && minUpvotes > 0) {
      body.options.minUpvotes = minUpvotes;
    }
    if (opts.maxAge) {
      body.options.maxAgeHours = parseInt(opts.maxAge, 10);
    }

    try {
      const data = await apiFetch("/api/search", {
        method: "POST",
        body: JSON.stringify(body),
      }) as any;

      spinner.succeed(`Analysis complete — ${data.postsAnalyzed ?? 0} posts analyzed`);

      if (opts.json) {
        console.log(JSON.stringify(data, null, 2));
        return;
      }

      console.log("");
      console.log(chalk.bold("Summary"));
      console.log(chalk.dim("─".repeat(60)));
      console.log(data.summary || "No summary available.");
      console.log("");

      if (data.problems?.length) {
        console.log(chalk.bold("Top Problems"));
        console.log(chalk.dim("─".repeat(60)));
        (data.problems as any[]).slice(0, 8).forEach((p: any, i: number) => {
          const barFilled = Math.round((p.frequency / 10) * 8);
          const bar = "█".repeat(barFilled) + "░".repeat(8 - barFilled);
          const sentiment =
            p.sentiment === "frustrated" ? chalk.red(p.sentiment)
            : p.sentiment === "confused" ? chalk.yellow(p.sentiment)
            : chalk.dim(p.sentiment);
          console.log(`${chalk.dim(String(i + 1).padStart(2))}. ${p.text}`);
          console.log(`    ${chalk.dim(bar)} ${sentiment} · frequency ${p.frequency}/10`);
          console.log("");
        });
      }

      if (data.trends?.length) {
        console.log(chalk.bold("Trends"));
        console.log(chalk.dim("─".repeat(60)));
        console.log((data.trends as string[]).map((t: string) => chalk.cyan(`#${t}`)).join("  "));
        console.log("");
      }

      const remaining = data.credits?.remaining ?? "?";
      console.log(chalk.dim(`Cost: $${data.cost ?? "0.05"} · ${remaining} credits remaining · Request ID: ${data.requestId}`));
    } catch (err) {
      spinner.fail("Search failed");
      console.error(err);
      process.exit(1);
    }
  });

// uncover status
program
  .command("status")
  .description("Show current plan and credit balance")
  .action(async () => {
    const spinner = ora("Fetching status...").start();
    try {
      const data = await apiFetch("/api/billing/status") as any;
      spinner.stop();

      console.log("");
      console.log(chalk.bold("Uncover — Account Status"));
      console.log(chalk.dim("─".repeat(40)));
      console.log(`Plan          ${chalk.cyan(data.plan.toUpperCase())}`);
      console.log(`Credits       ${chalk.yellow(String(data.credits))} remaining`);
      console.log(`Total Searches ${data.totalSearches}`);
      console.log(`Total Spent   $${data.totalSpent.toFixed(2)}`);

      if (data.isSubscriber && data.subscription) {
        console.log("");
        console.log(`Subscription  ${data.subscription.creditsPerCycle} credits/cycle`);
        console.log(`Resets        ${new Date(data.subscription.resetAt).toLocaleDateString()}`);
      }

      if (data.credits === 0) {
        console.log("");
        console.log(chalk.dim("Out of credits. Buy a pack: uncover.dev/dashboard"));
      }
    } catch {
      spinner.fail("Failed to fetch status");
      process.exit(1);
    }
  });

// uncover history
program
  .command("history")
  .description("Show recent search history")
  .option("--limit <n>", "Number of results", "10")
  .action(async (opts) => {
    const spinner = ora("Fetching history...").start();
    try {
      const data = await apiFetch(`/api/search/history?limit=${opts.limit}`) as any;
      spinner.stop();

      if (!data.requests?.length) {
        console.log(chalk.dim("No searches yet."));
        return;
      }

      console.log("");
      (data.requests as any[]).forEach((r: any) => {
        const status =
          r.status === "completed" ? chalk.green(r.status)
          : r.status === "failed" ? chalk.red(r.status)
          : chalk.yellow(r.status);
        const date = chalk.dim(new Date(r.createdAt).toLocaleString());
        console.log(`${date}  ${status}  "${r.query}"`);
      });
    } catch {
      spinner.fail("Failed to fetch history");
      process.exit(1);
    }
  });

// uncover keys
program
  .command("keys")
  .description("List your API keys")
  .action(async () => {
    const spinner = ora("Fetching keys...").start();
    try {
      const data = await apiFetch("/api/auth/keys") as any;
      spinner.stop();

      if (!data.apiKeys?.length) {
        console.log(chalk.dim("No API keys found."));
        return;
      }

      console.log("");
      console.log(chalk.bold("API Keys"));
      console.log(chalk.dim("─".repeat(40)));
      (data.apiKeys as any[]).forEach((k: any) => {
        const lastUsed = k.lastUsed
          ? `last used ${new Date(k.lastUsed).toLocaleDateString()}`
          : "never used";
        console.log(`${chalk.cyan(k.name.padEnd(20))} ${chalk.dim(lastUsed)}`);
      });
    } catch {
      spinner.fail("Failed to fetch keys");
      process.exit(1);
    }
  });

program.parse();
