"use client";

import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [apiKey, setApiKey] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/signup`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setMessage(`Error: ${data.error}`);
        return;
      }

      setApiKey(data.apiKey.key);
      setMessage(
        `✓ Account created! Your API key is: ${data.apiKey.key}`
      );
      setEmail("");
      setPassword("");
      setName("");
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/signin`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await response.json();
      if (!response.ok) {
        setMessage(`Error: ${data.error}`);
        return;
      }

      setMessage(`✓ Signed in! API Keys: ${data.apiKeys.map((k: any) => k.name).join(", ")}`);
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(`Error: ${error}`);
    }
  };

  return (
    <main style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ marginBottom: "3rem" }}>
        <h2>Uncover API</h2>
        <p>
          Discover real problems people mention on Reddit and Twitter using AI
          analysis.
        </p>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
          <button
            onClick={() => setActiveTab("login")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: activeTab === "login" ? "#000" : "#eee",
              color: activeTab === "login" ? "#fff" : "#000",
              border: "none",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab("signup")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: activeTab === "signup" ? "#000" : "#eee",
              color: activeTab === "signup" ? "#fff" : "#000",
              border: "none",
              cursor: "pointer",
              borderRadius: "4px",
            }}
          >
            Sign Up
          </button>
        </div>

        <form
          onSubmit={activeTab === "login" ? handleSignin : handleSignup}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          {activeTab === "signup" && (
            <input
              type="text"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                padding: "0.75rem",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            />
          )}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              padding: "0.75rem",
              border: "1px solid #ddd",
              borderRadius: "4px",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "0.75rem",
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            {activeTab === "login" ? "Sign In" : "Sign Up"}
          </button>
        </form>

        {message && (
          <div
            style={{
              marginTop: "1rem",
              padding: "1rem",
              backgroundColor: message.startsWith("✓") ? "#f0f9ff" : "#fef2f2",
              border: `1px solid ${message.startsWith("✓") ? "#0ea5e9" : "#ef4444"}`,
              borderRadius: "4px",
              wordBreak: "break-all",
            }}
          >
            {message}
          </div>
        )}
      </div>

      {apiKey && (
        <div style={{ marginTop: "2rem", padding: "1rem", backgroundColor: "#f0fdf4", border: "1px solid #22c55e", borderRadius: "4px" }}>
          <h3>Next Steps</h3>
          <p>Use this API key to make requests:</p>
          <code style={{
            display: "block",
            padding: "0.5rem",
            backgroundColor: "#fff",
            border: "1px solid #ddd",
            borderRadius: "4px",
            marginBottom: "1rem",
            overflowX: "auto"
          }}>
            {apiKey}
          </code>
          <p>
            Docs: Check the API documentation to learn how to use the search
            endpoint and NPM SDK.
          </p>
        </div>
      )}
    </main>
  );
}
