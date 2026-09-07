import SignInPageClient from "@/components/page/sign-in/SignInPageClient";
import {Suspense} from "react";

export default async function SignInPageServer() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <div>Loading...</div>
            </div>
        }>
            <SignInPageClient />
        </Suspense>
    )
}