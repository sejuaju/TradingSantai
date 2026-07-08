import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import Providers from "@/components/Providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trading Santai - Komunitas Trader Indonesia",
  description:
    "Bergabung dengan 3,000+ trader yang sudah merasakan profit konsisten bersama Trading Santai. Edukasi, sinyal, dan komunitas terbaik.",
  openGraph: {
    title: "Trading Santai - Komunitas Trader Indonesia",
    description:
      "Bergabung dengan 3,000+ trader yang sudah merasakan profit konsisten bersama Trading Santai.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}