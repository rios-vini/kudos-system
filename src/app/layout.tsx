import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kudos | Datacom Internal Portal",
  description:
    "Give kudos to your colleagues and see recent recognition across the company.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
