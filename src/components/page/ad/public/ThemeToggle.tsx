'use client'

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ad-theme-preview";

export default function ThemeToggle() {
    // 서버와 첫 클라이언트 렌더는 항상 동일(라이트 고정) — hydration mismatch 방지.
    // 저장된 테마는 마운트 후 effect에서 반영한다 (initializer에서 읽으면
    // 저장값 dark 보유 시 서버 HTML과 달라져 하이드레이션 실패).
    const [isLight, setIsLight] = useState<boolean>(true);

    useEffect(() => {
        try {
            if (window.localStorage.getItem(STORAGE_KEY) === "dark") {
                document.documentElement.classList.remove("theme-light");
                setIsLight(false);
                return;
            }
        } catch {
            /* storage unavailable */
        }
        document.documentElement.classList.add("theme-light");
    }, []);

    const onClickToggle = () => {
        const next = !isLight;
        setIsLight(next);
        try {
            if (next) {
                document.documentElement.classList.add("theme-light");
                localStorage.setItem(STORAGE_KEY, "light");
            } else {
                document.documentElement.classList.remove("theme-light");
                localStorage.setItem(STORAGE_KEY, "dark");
            }
        } catch {
            /* storage unavailable */
        }
    };

    return (
        <button
            type="button"
            onClick={onClickToggle}
            suppressHydrationWarning
            aria-label="Toggle dark/light theme preview"
            title="다크 / 라이트 미리보기 (임시 데모용)"
            className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface/80 text-text2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors duration-200 hover:text-accent"
        >
            {isLight ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
        </button>
    );
}
