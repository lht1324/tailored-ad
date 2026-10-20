'use client'

import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react'
import { User } from '@/lib/api/types/supabase/Users'
import { authClient } from "@/lib/auth/client";
import { useBatchEvents } from "@/components/public/useBatchEvents";
import {usersClientAPI} from "@/lib/api/client/usersClientAPI";
import {consumeStoredUtm} from "@/lib/utm";

export enum OAuthProvider {
    Google = "google",
    GitHub = "github"
}

interface AuthContextType {
    user: User | null
    isInitializingAuthContext: boolean
    signInWithOAuth: (provider: OAuthProvider, redirectTo?: string) => Promise<{ error?: string }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    // Better Auth 세션 (auth 테이블 신원) — 우리 users 행과 분리. 매칭은 email로.
    // Better Auth 세션 (auth 테이블 신원) — 우리 users 행과 분리. 매칭은 email로.
    const { data: session, isPending: isSessionPending } = authClient.useSession();
    const [user, setUser] = useState<User | null>(null)
    const [profileKnown, setProfileKnown] = useState(false)
    const lastEmailRef = useRef<string | null>(null);

    // 세션 email → 우리 users 행 (ID 체계가 달라서 email 매핑. 없으면 null)
    const loadProfile = useCallback(async (email: string) => {
        const profile = await usersClientAPI.getUserByEmail(email);
        setUser(profile);
        setProfileKnown(true);
        // UTM 귀속 기록 (10-20) — 로그인 1회만. 저장값은 consume이라 재사용 안 됨.
        if (profile) {
            const utm = consumeStoredUtm();
            if (utm) {
                void usersClientAPI.patchUserByUserId(profile.id, utm).catch(() => {
                    /* 귀속 실패는 무시 — 핵심 흐름(로그인) 막지 않음 */
                });
            }
        }
    }, []);

    useEffect(() => {
        if (isSessionPending) return;
        const email = session?.user?.email ?? null;
        let cancelled = false;
        // 동기 setState는 lint(react-hooks/set-state-in-effect) 위반이라 마이크로태스크로 지연
        void Promise.resolve().then(() => {
            if (cancelled) return;
            if (!email) {
                lastEmailRef.current = null;
                setUser(null);
                setProfileKnown(true);
                return;
            }
            // 동일 email이면 재조회 생략 (세션 갱신 반복 호출 방지)
            if (email === lastEmailRef.current) return;
            lastEmailRef.current = email;
            setProfileKnown(false);
            void loadProfile(email);
        });
        return () => {
            cancelled = true;
        };
    }, [session?.user?.email, isSessionPending, loadProfile]);

    const refreshUser = useCallback(async () => {
        const email = session?.user?.email;
        if (email) {
            await loadProfile(email);
        }
    }, [session?.user?.email, loadProfile]);

    const signInWithOAuth = useCallback(async (provider: OAuthProvider, redirectTo?: string): Promise<{ error?: string }> => {
        try {
            // 빌드타임 NEXT_PUBLIC_BASE_URL 금지 — prod 번들에 localhost가 박혀 OAuth가 localhost로 튐.
            // 클라 런타임 origin이 항상 정답 (dev localhost·ngrok·prod 실도메인 전부).
            // callbackURL은 trusted domains에 등록돼 있어야 함 (localhost 기본 허용).
            const callbackURL = `${window.location.origin}/callback/auth${redirectTo ? `?redirectTo=${redirectTo}` : ""}`;
            const { error } = await authClient.signIn.social({
                provider,
                callbackURL,
            });
            if (error) {
                throw error;
            }
            // 팝업 모드: 세션 확정 후 콜백으로 이동 (행 생성).
            // 성공 후 이동을 안 하면 행 만드는 곳을 영원히 안 거쳐서 prod 빈 DB에서 터진다.
            // 리다이렉트 모드에선 페이지가 언로드돼 이 코드가 실행 안 됨 (문제없음).
            for (let i = 0; i < 20; i++) {
                try {
                    const { data } = await authClient.getSession();
                    if (data?.session) break;
                } catch {
                    /* 재시도 */
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
            // 전체 로드 고의 사용 — 콜백 route 핸들러 실행 + 쿠키 확정이 필요해서
            // router 내비게이션(route 핸들러행 미지원 가능) 대신 쓴다.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.href = callbackURL;
            return {}
        } catch (error) {
            return { error: `An error occurred during ${provider} sign in: ${error instanceof Error ? error.message : 'Unknown error'}` }
        }
    }, []);

    const signOut = useCallback(async () => {
        await authClient.signOut();
        setUser(null);
        setProfileKnown(true);
    }, []);

    // Users 변경 알림 — 플랜 동기화 등 서버 쓰기 시 프로필 강제 재조회
    useBatchEvents({
        userId: user?.id,
        onEvent: (event) => {
            if (event.type !== 'user' || !user?.id) return;
            const userId = user.id;
            void usersClientAPI.getUserByUserId(userId).then((profile) => setUser(profile));
        },
    });

    const value: AuthContextType = {
        user: user,
        isInitializingAuthContext: isSessionPending || !profileKnown,
        signInWithOAuth: signInWithOAuth,
        signOut: signOut,
        refreshUser: refreshUser
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
