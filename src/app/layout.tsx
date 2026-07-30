import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cluco — Pre-Litigation Pipeline",
  description: "Intelligent document onboarding and analysis for pre-litigation legal workflows.",
};

import { ClerkProvider } from '@clerk/nextjs'
import { auth } from '@clerk/nextjs/server'

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await auth.protect();

  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body style={{ fontFamily: 'var(--font-inter), Inter, -apple-system, sans-serif' }}>
          <div style={{ display: "flex", minHeight: "100vh" }}>
              <Sidebar />
              <main
                style={{
                  marginLeft: "var(--sidebar-width)",
                  flex: 1,
                  minHeight: "100vh",
                  overflow: "auto",
                  backgroundColor: "transparent",
                }}
              >
                {children}
              </main>
            </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
