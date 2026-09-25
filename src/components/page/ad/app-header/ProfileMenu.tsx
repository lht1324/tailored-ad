'use client'

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LogOut, User } from 'lucide-react';
import { useAuth } from "@/context/AuthContext";

/**
 * 프로필 드롭다운 — 아바타 1개로 Profile 진입 + Sign out 처리.
 * 랜딩·앱 헤더 공용. 바깥 클릭·Escape으로 닫힘.
 */
function ProfileMenu() {
    const router = useRouter();
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSigningOut, setIsSigningOut] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        const onDown = (e: MouseEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [isOpen]);

    const onClickSignOut = useCallback(async () => {
        setIsSigningOut(true);
        try {
            await signOut();
            setIsOpen(false);
            router.push('/');
        } finally {
            setIsSigningOut(false);
        }
    }, [signOut, router]);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                aria-label="Account menu"
                aria-expanded={isOpen}
                className="flex items-center justify-center overflow-hidden rounded-full border border-hairline text-text2 transition-colors hover:bg-canvas hover:text-text1"
            >
                {user?.avatar_url ? (
                    <Image
                        src={user.avatar_url}
                        alt="Profile"
                        width={36}
                        height={36}
                        unoptimized
                        className="h-9 w-9 rounded-full object-cover"
                    />
                ) : (
                    <span className="flex items-center justify-center p-2.5">
                        <User className="h-4 w-4" strokeWidth={2.2} />
                    </span>
                )}
            </button>
            {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl">
                    <Link
                        href="/profile"
                        onClick={() => setIsOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-text1 transition-colors hover:bg-canvas"
                    >
                        <User className="h-4 w-4 text-text2" strokeWidth={2} />
                        <span>Profile</span>
                    </Link>
                    <button
                        type="button"
                        onClick={onClickSignOut}
                        disabled={isSigningOut}
                        className="flex w-full items-center gap-2.5 border-t border-hairline px-4 py-2.5 text-[13px] font-medium text-text2 transition-colors hover:bg-canvas hover:text-text1 disabled:opacity-50"
                    >
                        <LogOut className="h-4 w-4" strokeWidth={2} />
                        <span>{isSigningOut ? 'Signing out…' : 'Sign out'}</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export default memo(ProfileMenu);
