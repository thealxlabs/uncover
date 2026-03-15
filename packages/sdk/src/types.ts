export type Source = "reddit" | "twitter" | "hackernews";

export interface SearchOptions {
  excludeSubreddits?: string[];
  excludeKeywords?: string[];
  minUpvotes?: number;
  maxAgeHours?: number;
}

export interface SearchRequest {
  query: string;
  sources: Source[];
  limit?: number;
  options?: SearchOptions;
}

export interface Problem {
  text: string;
  frequency: number;
  sentiment: "frustrated" | "confused" | "disappointed" | "neutral";
}

export interface SearchResponse {
  requestId: string;
  status: "pending" | "processing" | "completed" | "failed";
  query: string;
  sources: Source[];
  postsAnalyzed?: number;
  problems?: Problem[];
  summary?: string;
  trends?: string[];
  cost?: number;
  credits?: {
    remaining: number;
  };
}

export interface SearchStatusResponse {
  requestId: string;
  status: "pending" | "processing" | "completed" | "failed";
  query: string;
  sources: Source[];
  postsAnalyzed?: number;
  problems?: Problem[];
  summary?: string;
  trends?: string[];
  cost?: number;
  createdAt: string;
}

export interface SignupResponse {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  apiKey: {
    id: string;
    key: string;
    name: string;
  };
}

export interface SigninResponse {
  user: {
    id: string;
    email: string;
    name?: string;
  };
  apiKeys: Array<{
    id: string;
    name: string;
    createdAt: string;
    lastUsed: string | null;
  }>;
  message: string;
}
