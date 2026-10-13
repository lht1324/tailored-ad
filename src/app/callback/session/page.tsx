import { Suspense } from 'react';
import CallbackSessionClient from "@/components/page/callback/CallbackSessionClient";

export default function CallbackSessionPage() {
    return (
        <Suspense>
            <CallbackSessionClient />
        </Suspense>
    );
}
