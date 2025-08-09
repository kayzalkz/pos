import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context' // Make sure this path is correct

// MODIFIED: Added the 'icons' property for the browser tab icon
export const metadata: Metadata = {
  title: 'POS System',
  description: 'Created by Kyaw Zin Lin',
  icons: {
    // Using a self-contained SVG emoji as a clean, dependency-free stock icon (🧾)
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🧾</text></svg>',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // MODIFIED: Improved font handling by applying CSS variables to <html>
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      {/* The <head> tag is no longer needed here as metadata handles it */}
      <body className={GeistSans.className}>
        {/*
          Assuming you want the AuthProvider to wrap your entire application,
          which is standard practice.
        */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
