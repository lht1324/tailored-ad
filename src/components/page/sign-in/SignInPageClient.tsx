'use client'

import {memo, useCallback, useMemo, useState} from "react";
import {useSearchParams} from "next/navigation";
import {OAuthProvider, useAuth} from "@/context/AuthContext";
import AuthForm from "@/components/page/sign-in/AuthForm";

function SignInPageClient() {
    const searchParams = useSearchParams();

    const { signInWithOAuth } = useAuth();

    // OAuth failure flag comes from the redirect URL: derive initial state
    // during render instead of syncing it in an effect.
    const [error, setError] = useState<string | null>(() => {
        try {
            return searchParams.get('error') === 'oauth_failed'
                ? 'OAuth sign-in failed. Please try again.'
                : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(false);

    const redirectTo = useMemo(() => {
        return searchParams.get("redirectTo");
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
        <div className="relative min-h-screen overflow-hidden bg-canvas">
            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[28rem] flex-col justify-center px-4 py-16 sm:px-6">
                <AuthForm
                    title="Welcome to TailorAd"
                    subtitle="Sign in. Create tailored ads."
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