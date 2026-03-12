import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uncover — Surface Real Problems from Social Data",
  description: "Query Reddit, X, and HackerNews. Get structured pain points, trends, and AI analysis.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        background: "#080808",
        color: "#e8e8e8",
        fontFamily: "'Syne', sans-serif",
        minHeight: "100vh",
      }}>
        {children}
      </body>
    </html>
  );
}
