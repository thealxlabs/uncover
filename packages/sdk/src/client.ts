import type { SearchRequest, SearchResponse, SearchStatusResponse } from "./types.js";

export class Uncover {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string, baseUrl = "https://api.uncover.dev") {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    const response = await fetch(`${this.baseUrl}/api/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Search failed: ${(error as any).error || "Unknown error"}`);
    }

    return response.json();
  }

  async getSearchStatus(requestId: string): Promise<SearchStatusResponse> {
    const response = await fetch(`${this.baseUrl}/api/search/${requestId}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to get status: ${(error as any).error || "Unknown error"}`);
    }

    return response.json();
  }

  async waitForSearch(
    requestId: string,
    timeoutMs = 30000,
    pollIntervalMs = 1000
  ): Promise<SearchStatusResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getSearchStatus(requestId);
      if (status.status === "completed" || status.status === "failed") {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error("Search request timed out");
  }
}

export default Uncover;
