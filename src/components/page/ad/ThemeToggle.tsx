'use client'

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "ad-theme-preview";

export default function ThemeToggle() {
    const [isLight, setIsLight] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === "light") {
            document.documentElement.classList.add("theme-light");
            setIsLight(true);
        }
    }, []);

    const onClickToggle = () => {
        const next = !isLight;
        setIsLight(next);
        if (next) {
            document.documentElement.classList.add("theme-light");
            localStorage.setItem(STORAGE_KEY, "light");
        } else {
            document.documentElement.classList.remove("theme-light");
            localStorage.setItem(STORAGE_KEY, "dark");
        }
    };

    return (
        <button
            type="button"
            onClick={onClickToggle}
            aria-label="Toggle dark/light theme preview"
            title="다크 / 라이트 미리보기 (임시 데모용)"
            className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-hairline bg-surface/80 text-text2 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-colors duration-200 hover:text-accent"
        >
            {isLight ? <Moon size={18} strokeWidth={2} /> : <Sun size={18} strokeWidth={2} />}
        </button>
    );
}
