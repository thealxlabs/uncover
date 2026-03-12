import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Uncover - Find Real Problems from Social Media",
  description: "Search Reddit and Twitter to discover what problems people face",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <nav
          style={{
            padding: "1rem 2rem",
            borderBottom: "1px solid #eee",
            marginBottom: "2rem",
          }}
        >
          <h1>Uncover</h1>
        </nav>
        {children}
      </body>
    </html>
  );
}
