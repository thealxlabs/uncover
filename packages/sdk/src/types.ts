export type Source = "reddit" | "twitter";

export interface SearchRequest {
  query: string;
  sources: Source[];
  limit?: number;
}

export interface Problem {
  text: string;
  frequency: number;
  sentiment: string;
}

export interface SearchResponse {
  requestId: string;
  status: "pending" | "processing" | "completed" | "failed";
  query: string;
  sources: Source[];
  problems?: Problem[];
  summary?: string;
  trends?: string[];
  cost?: number;
}

export interface SearchStatusResponse {
  requestId: string;
  status: "pending" | "processing" | "completed" | "failed";
  query: string;
  sources: Source[];
  problems?: Problem[];
  summary?: string;
  trends?: string[];
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
  }>;
}
