import EditorPageClient from "@/components/page/ad/projects/[projectId]/edit/EditorPageClient";
import { Suspense } from "react";

export default async function EditorPageServer() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-canvas">
                <div className="text-sm text-text2">Loading editor...</div>
            </div>
        }>
            <EditorPageClient />
        </Suspense>
    )
}
