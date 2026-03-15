/**
 * Simple per-service rate limiter using token bucket semantics.
 * Ensures we don't hammer external services beyond their allowed rates.
 */

interface ServiceConfig {
  minIntervalMs: number;
}

const SERVICE_CONFIGS: Record<string, ServiceConfig> = {
  reddit: { minIntervalMs: 1100 },    // ~1 req/sec
  twitter: { minIntervalMs: 500 },    // ~2 req/sec
  hackernews: { minIntervalMs: 200 }, // Algolia is generous
  default: { minIntervalMs: 1000 },
};

class RateLimiter {
  private lastRequests = new Map<string, number>();

  async acquire(service: string): Promise<void> {
    const config = SERVICE_CONFIGS[service] ?? SERVICE_CONFIGS.default;
    const last = this.lastRequests.get(service) ?? 0;
    const elapsed = Date.now() - last;
    const wait = config.minIntervalMs - elapsed;

    if (wait > 0) {
      await new Promise<void>((resolve) => setTimeout(resolve, wait));
    }

    this.lastRequests.set(service, Date.now());
  }

  timeUntilAvailable(service: string): number {
    const config = SERVICE_CONFIGS[service] ?? SERVICE_CONFIGS.default;
    const last = this.lastRequests.get(service) ?? 0;
    return Math.max(0, config.minIntervalMs - (Date.now() - last));
  }
}

export const rateLimiter = new RateLimiter();
