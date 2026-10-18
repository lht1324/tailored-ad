import type { Metadata } from "next";
import { Suspense } from 'react';
import CallbackSessionClient from "@/components/page/callback/CallbackSessionClient";

// OAuth 중간 경유지 — 로그인 플로우 일부라 비로그인 접근이 정상. 가드(matcher)에 넣으면 플로우가 깨지므로
// 넣지 않고, 검색 색인만 차단한다.
export const metadata: Metadata = {
    title: "Sign in",
    robots: {
        index: false,
        follow: false,
    },
};

export default function CallbackSessionPage() {
    return (
        <Suspense>
            <CallbackSessionClient />
        </Suspense>
    );
}
