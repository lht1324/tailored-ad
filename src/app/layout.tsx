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
  icons: {
    icon: "/logo/logo-32.png",
    apple: "/logo/logo-180.png",
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
      {/* Cloudflare Web Analytics (수동 설치) — Workers 정적 자산 경로라 자동 주입이 안 돼 직접 삽입.
          무료·쿠키 없음(배너 불필요). 방문·referrer·실사용자 LCP/INP/CLS 수집.
          async 필수: React 19는 async 스크립트만 <head>로 호이스팅한다. defer/동기면 <html> 자식에 남아
          "Cannot render a sync or defer <script>" + hydration 에러가 난다(10-21 실측).
          prod 전용: NODE_ENV는 빌드타임 상수라 dev 빌드엔 아예 들어가지 않는다. dev에서 실행하면
          토큰이 prod 도메인용이라 CORS로 차단되고(콘솔 에러), dev 세션이 prod 분석에 섞인다. */}
      {process.env.NODE_ENV === 'production' && (
        <script
          async
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "3ad5622db88c4a81aa13ef65c25323ba"}'
        />
      )}
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
