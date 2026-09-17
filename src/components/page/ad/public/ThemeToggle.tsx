'use client'

import { Moon, Sun } from "lucide-react";
import { useState } from "react";

const STORAGE_KEY = "ad-theme-preview";

export default function ThemeToggle() {
    // Lazy initializer keeps the icon and the document class in sync from the
    // first client render. Light is the default; only an explicit stored
    // "dark" starts dark. A transient mismatch is harmless here (preview UI).
    const [isLight, setIsLight] = useState<boolean>(() => {
        if (typeof window === "undefined") return true;
        try {
            if (window.localStorage.getItem(STORAGE_KEY) === "dark") {
                document.documentElement.classList.remove("theme-light");
                return false;
            }
        } catch {
            /* storage unavailable */
        }
        document.documentElement.classList.add("theme-light");
        return true;
    });

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
