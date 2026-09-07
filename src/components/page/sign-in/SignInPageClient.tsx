'use client'

import {memo, useCallback, useEffect, useMemo, useState} from "react";
import {useSearchParams} from "next/navigation";
import {OAuthProvider, useAuth} from "@/context/AuthContext";
import AuthForm from "@/components/page/sign-in/AuthForm";

function SignInPageClient() {
    const searchParams = useSearchParams();

    const { signInWithOAuth } = useAuth();

    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const redirectTo = useMemo(() => {
        return searchParams.get("redirectTo");
    }, [searchParams]);

    useEffect(() => {
        const urlError = searchParams.get('error')
        if (urlError === 'oauth_failed') {
            setError('OAuth sign-in failed. Please try again.')
        }
    }, [searchParams]);

    const handleOAuthSignIn = useCallback(async (provider: OAuthProvider) => {
        setError(null)
        setIsLoading(true)

        try {
            const result = await signInWithOAuth(provider, redirectTo ?? undefined);
            if (result.error) {
                setError(result.error)
                setIsLoading(false)
            }
            // OAuth는 리다이렉트되므로 로딩 상태 유지
        } catch (error) {
            setError('Google 로그인 중 오류가 발생했습니다.')
            setIsLoading(false)
        }
    }, [signInWithOAuth, redirectTo]);

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden">
            {/* Background Effects - Toned down significantly */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500 rounded-full blur-[120px]"></div>
            </div>

            {/* Content */}
            <div className="relative z-10 flex items-start justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8" style={{paddingTop: 'calc(45vh - 16rem)'}}>
                <AuthForm
                    title="Welcome to TailorAd"
                    subtitle="Sign in. Create short. Keep it real."
                    footerText="New here? No problem - just pick any option above!"
                    loading={isLoading}
                    error={error}
                    oAuthSignIn={handleOAuthSignIn}
                />
            </div>
        </div>
    )
}

export default memo(SignInPageClient);