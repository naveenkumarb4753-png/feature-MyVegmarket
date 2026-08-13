import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getSearchIndex } from "@/lib/searchIndex";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MyVegmarket",
    template: "%s | MyVegmarket",
  },
  verification: {
  google: "y_RI99OkaWLvMQWpbM_NVwQk0saw_zNWtTfyvl_G3VA",
},
  description: "Dubai's Premium Sourcing Platform",
  openGraph: {
    siteName: "MyVegmarket",
    title: "MyVegmarket",
    description: "Dubai's Premium Sourcing Platform",
  },
  twitter: {
    title: "MyVegmarket",
    description: "Dubai's Premium Sourcing Platform",
  },
};

export const revalidate = 300;

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchIndex = await getSearchIndex();

  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght@100..700"
        />
      </head>

      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white text-[#111713] min-h-screen flex flex-col`}
        style={
          {
            ["--navbar-h" as any]: "76px",
          } as React.CSSProperties
        }
      >
        <Navbar searchIndex={searchIndex} />

        <main className="flex-1 pt-[var(--navbar-h)]">
          <div className="block md:hidden h-[56px]" />
          {children}
        </main>

        <Footer />
      </body>
    </html>
  );
}