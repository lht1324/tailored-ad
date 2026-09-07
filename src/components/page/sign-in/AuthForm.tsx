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
        <div className="w-full h-fit max-w-[400px] mx-auto bg-zinc-900/40 border border-white/5 rounded-2xl shadow-2xl p-8 backdrop-blur-md">
            <div className="text-center mb-10">
                <Image
                    src="/logo/logo-64.png"
                    alt="TailorAd"
                    width={56}
                    height={56}
                    className="mx-auto mb-6"
                />
                <h1 className="text-3xl font-bold text-zinc-100 mb-2">
                    {title}
                </h1>
                <p className="text-zinc-500 text-sm font-medium">
                    {subtitle}
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-xs font-medium text-center">{error}</p>
                </div>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-8 flex flex-col w-full">
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
            <div className="text-center mb-8">
                <p className="text-xs text-zinc-600 font-medium">
                    {footerText}
                </p>
            </div>

            {/* Legal Disclaimer (Click-wrap) */}
            <div className="pt-6 border-t border-white/5 text-center space-y-3">
                <p className="text-[11px] text-zinc-600 leading-relaxed px-4">
                    By continuing, you agree to our{' '}
                    <a href="/legal/terms" target="_blank" className="text-zinc-400 hover:text-zinc-200 transition-colors font-semibold">
                        Terms
                    </a>{' '}
                    and{' '}
                    <a href="/legal/privacy" target="_blank" className="text-zinc-400 hover:text-zinc-200 transition-colors font-semibold">
                        Privacy Policy
                    </a>.
                </p>
                <p className="text-[10px] text-zinc-700 font-medium leading-tight">
                    * You acknowledge that the service begins immediately and waive the right of withdrawal.
                </p>
            </div>
        </div>
    )
}

export default memo(AuthForm)