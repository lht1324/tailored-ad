import SignInPageClient from "@/components/page/sign-in/SignInPageClient";
import {Suspense} from "react";

export default async function SignInPageServer() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <div className="text-sm text-text2">Loading...</div>
            </div>
        }>
            <SignInPageClient />
        </Suspense>
    )
}