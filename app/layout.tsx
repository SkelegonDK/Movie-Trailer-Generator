import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"
import { Toaster } from "@/components/ui/toaster"
import { StudioAtmosphere } from "@/components/studio-atmosphere"

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
})

export const metadata: Metadata = {
  title: "Manuelito's Movie Trailer Generator",
  description: "AI-powered movie trailer generator",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <StudioAtmosphere>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-md focus:bg-accent focus:px-4 focus:py-3 focus:text-accent-foreground">Skip to content</a>
        <Sidebar />
        <main id="main-content" tabIndex={-1} className="relative min-h-[calc(100dvh-3.5rem)] min-w-0 md:ml-56 md:min-h-dvh">{children}</main>
        <Toaster />
        </StudioAtmosphere>
      </body>
    </html>
  )
}
