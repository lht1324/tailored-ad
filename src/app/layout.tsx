import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tailoredad.com"),
  applicationName: "TailorAd",
  title: {
    template: "TailorAd | %s",
    default: "TailorAd | Harnessed AI Ad Studio",
  },
  description:
    "Tailored ads, not templates. Harnessed AI still-image ad creative, directed for performance.",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <div className="min-h-screen bg-canvas text-text1 font-satoshi">
            <main>{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
