import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Barlow_Condensed } from "next/font/google";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-barlow",
});

export const metadata: Metadata = {
  title: "Catalyst Coaching | Private Physique Coaching",
  description:
    "Application-based private physique coaching. Custom programming, nutrition guidance, and accountability for driven people who want real results.",
  icons: {
    icon: "/logos/mark-gold.png",
    shortcut: "/logos/mark-gold.png",
    apple: "/logos/mark-gold.png",
  },
  openGraph: {
    title: "Catalyst Coaching | Private Physique Coaching",
    description: "Application-based private physique coaching. Real structure. Real results.",
    url: "https://catalystcoachingelite.com",
    siteName: "Catalyst Coaching",
    images: [{ url: "/logos/mark-gold.png", width: 512, height: 512 }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geist.variable} ${barlowCondensed.variable} antialiased`}
      >
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
