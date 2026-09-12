'use client'

import {memo} from 'react'
import {OAuthProvider} from "@/context/AuthContext";
import GoogleSignInButton from "@/components/public/GoogleSignInButton";
import DefaultSignInButton from "@/components/public/DefaultSignInButton";
import Image from "next/image";

interface AuthFormProps {
    title: string
    subtitle: string
    footerText: string
    loading?: boolean
    error?: string | null
    oAuthSignIn: (provider: OAuthProvider) => void
}

function AuthForm({ 
    title, 
    subtitle, 
    footerText, 
    loading = false,
    error = null,
    oAuthSignIn,
}: AuthFormProps) {
    return (
        <div className="w-full rounded-[1.5rem] border border-hairline bg-surface p-8 shadow-[0_24px_64px_-32px_rgba(0,0,0,0.45)]">
            <div className="mb-8 text-center">
                <Image
                    src="/logo/logo-64.png"
                    alt="TailoredAd"
                    width={56}
                    height={56}
                    className="mx-auto mb-6 rounded-2xl"
                />
                <h1 className="text-[28px] font-bold tracking-tight text-text1">
                    {title}
                </h1>
                <p className="mt-2 text-sm font-medium text-text2">
                    {subtitle}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <p className="text-center text-xs font-medium text-red-400">{error}</p>
                </div>
            )}

            {/* OAuth Buttons */}
            <div className="mb-6 flex w-full flex-col space-y-3">
                <GoogleSignInButton
                    text="Continue with Google"
                    onClick={() => oAuthSignIn(OAuthProvider.Google)}
                    disabled={loading}
                />
                <DefaultSignInButton
                    text="Continue with GitHub"
                    src="/icons/service-logo-github.svg"
                    onClick={() => oAuthSignIn(OAuthProvider.GitHub)}
                    disabled={loading}
                />
            </div>

            {/* Footer */}
            <div className="mb-6 text-center">
                <p className="text-xs font-medium text-text2">
                    {footerText}
                </p>
            </div>

            {/* Legal Disclaimer (Click-wrap) */}
            <div className="space-y-3 border-t border-hairline pt-6 text-center">
                <p className="px-4 text-[11px] leading-relaxed text-text2">
                    By continuing, you agree to our{' '}
                    <a href="/legal/terms" target="_blank" className="font-semibold text-text1 hover:text-accent transition-colors">
                        Terms
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy" target="_blank" className="font-semibold text-text1 hover:text-accent transition-colors">
                        Privacy Policy
                    </a>.
                </p>
                <p className="text-[10px] font-medium leading-tight text-text2">
                    * You acknowledge that the service begins immediately and waive the right of withdrawal.
                </p>
            </div>
        </div>
    )
}

export default memo(AuthForm)