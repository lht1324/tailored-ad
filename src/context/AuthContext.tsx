'use client'

import React, {createContext, useCallback, useContext, useEffect, useState} from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { User } from '@/lib/api/types/supabase/Users'
import {usersClientAPI} from "@/lib/api/client/usersClientAPI";
import {createBrowserClient} from "@supabase/ssr";

export enum OAuthProvider {
    Google = "google",
    GitHub = "github"
}

interface AuthContextType {
    user: User | null
    supabaseUser: SupabaseUser | null
    session: Session | null
    isInitializingAuthContext: boolean
    signInWithOAuth: (provider: OAuthProvider, redirectTo?: string) => Promise<{ error?: string }>
    signOut: () => Promise<void>
    refreshUser: () => Promise<void>
}
const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isInitialized, setIsInitialized] = useState(false)

    // 서버에서 사용자 프로필 가져오기 (중복 호출 방지)
    const fetchUserProfile = useCallback(async (userId: string) => {
        // 이미 같은 사용자의 프로필이 있다면 스킵
        if (user?.id === userId) {
            return user;
        }

        const result = await usersClientAPI.getUserByUserId(userId);
        return result;
    }, [user]);

    const refreshUser = useCallback(async () => {
        if (session?.user) {
            const profile = await fetchUserProfile(session.user.id)
            setUser(profile)
        }
    }, [session?.user, fetchUserProfile]);
    
    const getOAuthOptionByProvider = useCallback((provider: OAuthProvider) => {
        switch (provider) {
            case OAuthProvider.Google: return {
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            }
            case OAuthProvider.GitHub: return {
                scopes: 'user'
            }
        }
    }, []);
    
    const signInWithOAuth = useCallback(async (provider: OAuthProvider, redirectTo?: string): Promise<{ error?: string }> => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/callback/auth${redirectTo ? `?redirectTo=${redirectTo}` : ""}`,
                    ...getOAuthOptionByProvider(provider),
                }
            })
            if (error) {
                throw error;
            }
            return {}
        } catch (error) {
            return { error: `An error occurred during ${provider} sign in: ${error instanceof Error ? error.message : 'Unknown error'}` }
        }
    }, [getOAuthOptionByProvider]);

    const signOut = useCallback(async () => {
        await supabase.auth.signOut();
    }, []);

    useEffect(() => {
        // Auth 상태 변경 감지 (초기 상태도 포함)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (!isInitialized) {
                    setIsInitialized(true)
                }

                setSession(session)
                setSupabaseUser(session?.user ?? null)

                if (session?.user) {
                    const profile = await fetchUserProfile(session.user.id)
                    setUser(profile)
                } else {
                    setUser(null)
                }
                setIsLoading(false)
            }
        )

        return () => {
            subscription?.unsubscribe()
        }
    }, [fetchUserProfile, isInitialized]);

    // Users 테이블 실시간 구독
    useEffect(() => {
        if (!user?.id) return;

        const channel = supabase
            .channel(`user-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'users',
                    filter: `id=eq.${user.id}`,
                },
                (payload) => {
                    setUser(payload.new as User);
                }
            )
            .subscribe(() => {
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const value: AuthContextType = {
        user: user,
        supabaseUser: supabaseUser,
        session: session,
        isInitializingAuthContext: isLoading,
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