import type { NextConfig } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const isDev = process.env.NODE_ENV === "development";
// docker-compose.yml 확인
const isDocker = process.env.DOCKER === "true";

/**
 * 빌드 산출물 폴더 분리 — dev와 prod 빌드가 같은 .next를 쓰면 경합이 난다.
 * dev 서버가 .next/dev/types/*.ts(typed routes)를 쓰는 동안 prod 빌드의 타입체크가
 * 같은 파일을 읽으면 문법 오류로 빌드가 죽는다(10-20 실측: routes.d.ts ';' expected).
 * OpenNext는 prod distDir 커스텀을 지원하지 않으므로(prod는 .next 고정) dev만 옮긴다.
 *   로컬 dev(3000) → .next-dev / 도커 dev(3001) → .next-docker / prod 빌드 → .next
 */
const distDir =
    process.env.NEXT_DIST_DIR ?? (isDocker ? ".next-docker" : isDev ? ".next-dev" : ".next");

/**
 * .env 파일에서 플래그를 직접 읽는다.
 * next.config.ts는 Next가 .env를 로드하기 *전에* 평가되므로 process.env로 .env 값이 안 보인다
 * (쉘로 넘긴 값만 보인다). 그래서 이 파일만 .env.local → .env 순으로 직접 뒤진다.
 * 쉘 환경변수가 우선(표준 동작과 동일).
 */
function readEnvFlag(key: string): string | undefined {
    if (process.env[key]) return process.env[key];
    for (const file of [".env.local", ".env"]) {
        try {
            const content = readFileSync(join(process.cwd(), file), "utf8");
            const match = content.match(new RegExp(`^\\s*${key}\\s*=\\s*["']?([^"'\\s#]*)`, "m"));
            if (match?.[1]) return match[1];
        } catch {
            /* 파일 없음 — 다음 후보로 */
        }
    }
    return undefined;
}

// dev HMR 허용 호스트 — ngrok 경유 접속 시에만 (재시작마다 바뀌므로 env에서 파생, 하드코딩 금지)
const ngrokHostname = (() => {
    try {
        const { hostname } = new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "");
        return hostname.endsWith(".ngrok-free.dev") || hostname.endsWith(".ngrok.io")
            ? hostname
            : null;
    } catch {
        return null;
    }
})();

const nextConfig: NextConfig = {
  distDir,
  ...(isDev && ngrokHostname ? { allowedDevOrigins: [ngrokHostname] } : {}),

  // dev 도구 인디케이터(N 배지) 토글 — 스크린샷 촬영 세션에서만 숨김.
  // .env(.env.local)에 HIDE_DEV_INDICATOR=1 을 넣으면 배지 사라지고, 0 또는 줄 삭제면 다시 뜸.
  // prod 빌드엔 원래 없음(개발 전용 지표). 값은 dev 서버 시작 시점에 읽히므로 재시작 필요.
  ...(readEnvFlag("HIDE_DEV_INDICATOR") === "1" ? { devIndicators: false as const } : {}),

  images: {
    qualities: [100, 75],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        port: "",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "phhafvlylqajyffrfkwj.supabase.co",
        port: "",
        pathname: "/**",
      },
    ],
  },
  ...(isDev && isDocker
    ? {
        webpack: (config) => {
          config.watchOptions = {
            poll: 800,
            aggregateTimeout: 300,
            ignored: /node_modules|\.git/,
          };
          return config;
        },
      }
    : isDev
      ? {
          turbopack: {},
        }
      : {}),

  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          {
            key: "Access-Control-Allow-Origin",
            value:
              process.env.NODE_ENV === "production"
                ? "https://tailoredad.com"
                : "http://localhost:3000",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, ngrok-skip-browser-warning",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/assets/demo/:path*",
        destination:
          "https://sqwqmyhniwn4m1bu.public.blob.vercel-storage.com/:path*",
      },
    ];
  },
};

export default nextConfig;
