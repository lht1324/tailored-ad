import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// docker-compose.yml 확인
const isDocker = process.env.DOCKER === "true";

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
  distDir: isDocker ? ".next-docker" : ".next",
  ...(isDev && ngrokHostname ? { allowedDevOrigins: [ngrokHostname] } : {}),

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
