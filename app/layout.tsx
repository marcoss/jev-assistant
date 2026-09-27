import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ask",
  description: "A simple assistant with live weather and useful views.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
