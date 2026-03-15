import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uncover — Surface Real Problems from Social Data",
  description:
    "Query Reddit, X, and HackerNews. Get structured pain points, trends, and AI analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          :root {
            --sans: 'Syne', sans-serif;
            --mono: 'IBM Plex Mono', monospace;
            --bg: #080808;
            --surface: #0f0f0f;
            --border: #1c1c1c;
            --text: #e8e8e8;
            --muted: #555;
            --accent: #e8ff47;
          }
          body {
            background: var(--bg);
            color: var(--text);
            font-family: var(--sans);
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
          }
          input, select, button, textarea { font-family: inherit; }
          details summary::-webkit-details-marker { display: none; }
          details summary::before { content: '+ '; color: #333; }
          details[open] summary::before { content: '- '; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
