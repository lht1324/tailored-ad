import type { Metadata } from "next";
import { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://tailoredad.com"),
  applicationName: "TailoredAd",
  title: {
    template: "TailoredAd | %s",
    default: "TailoredAd | Harnessed AI Ad Studio",
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
    <html lang="en" className="theme-light">
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link
        href="https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,600,700,900&display=swap"
        rel="stylesheet"
        precedence="default"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&display=swap"
        rel="stylesheet"
        precedence="default"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo+Black&family=Barlow:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Barlow+Condensed:wght@300;400;500;600;700;800&family=Bebas+Neue&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Fira+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Fjalla+One&family=Fredoka:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500;600&family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=League+Gothic&family=League+Spartan:wght@300;400;500;600;700;800&family=Merriweather:ital,wght@0,300;0,400;0,700;0,900;1,300;1,400;1,700;1,900&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&family=Nunito:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Open+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Oswald:wght@300;400;500;600;700&family=Pathway+Gothic+One&family=Paytone+One&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=PT+Sans+Narrow:wght@400;700&family=Rajdhani:wght@300;400;500;600;700&family=Raleway:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=Roboto:ital,wght@0,400;0,500;0,700;1,400;1,500;1,700&family=Russo+One&family=Source+Sans+3:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&family=Staatliches&family=Syne:wght@400;500;600;700;800&family=Teko:wght@300;400;500;600;700&family=Titillium+Web:wght@300;400;600;700&family=Unbounded:wght@300;400;500;600;700;800&family=Work+Sans:ital,wght@0,300;0,400;0,600;0,700;1,300;1,400;1,600;1,700&display=swap"
        rel="stylesheet"
        precedence="default"
        crossOrigin="anonymous"
      />
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
