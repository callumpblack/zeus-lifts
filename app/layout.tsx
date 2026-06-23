import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-outfit",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Zeus Lifts",
  description: "Personal weight training tracker.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0F14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className="bg-ink text-white font-sans antialiased">
        {/* Phone-width column, centred on desktop. */}
        <div className="mx-auto min-h-dvh w-full max-w-app bg-ink">
          {children}
        </div>
      </body>
    </html>
  );
}
