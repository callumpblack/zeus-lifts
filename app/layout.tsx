import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zeus Lifts",
  description: "Personal weight training tracker.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ink text-white font-sans antialiased">
        {/* Phone-width column, centred on desktop. */}
        <div className="mx-auto min-h-dvh w-full max-w-app bg-ink">
          {children}
        </div>
      </body>
    </html>
  );
}
