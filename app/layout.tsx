import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Catalyst Coaching | Private Coaching. Elite Results.',
  description: 'Transform your body. Unlock your potential with elite private coaching.',
  icons: {
    icon: '/logos/mark-gold.png',   // browser tab icon
    shortcut: '/logos/mark-gold.png',
    apple: '/logos/mark-gold.png',
  },
  openGraph: {
    title: 'Catalyst Coaching',
    description: 'Private Coaching. Elite Results.',
    url: 'https://catalystcoachingelite.com',
    siteName: 'Catalyst Coaching',
    images: [
      {
        url: '/logos/mark-gold.png',
        width: 512,
        height: 512,
      },
    ],
    type: 'website',
  },
}
;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
