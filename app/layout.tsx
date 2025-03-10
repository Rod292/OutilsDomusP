import "@/styles/globals.css"
import { Inter } from "next/font/google"
import { IOSIcons } from "./components/ios-icons"
import type { Metadata, Viewport } from "next"
import type React from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "État des Lieux - Arthur Lloyd",
  description: "Application d'état des lieux par Arthur Lloyd",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "État des Lieux",
  },
  generator: 'v0.dev'
}

export const viewport: Viewport = {
  themeColor: "#DC0032",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1.5,
  minimumScale: 1,
  userScalable: true,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <IOSIcons />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="theme-color" content="#DC0032" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={`${inter.className} min-h-screen`}>{children}</body>
    </html>
  )
}