import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "TheFeet — The Teepovačka",
  description: "Kolik přijde lidí na koncert? Tipni si!",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TheFeet",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col env-safe">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
