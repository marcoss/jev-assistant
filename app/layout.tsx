import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jev — Your day, a little clearer",
  description: "Ask a question and get a useful view. An interactive generative UI prototype with live local weather.",
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
