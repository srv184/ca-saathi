import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CA Saathi — Practice Management for Indian CAs",
  description:
    "AI-powered GST reconciliation, notice replies, and client management for Indian Chartered Accountants",
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
