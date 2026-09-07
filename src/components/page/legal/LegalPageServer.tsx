import { Suspense } from 'react';
import LegalPageClient from './LegalPageClient';
import { LegalDataType } from "@/components/page/legal/LegalDataType";

interface LegalPageServerProps {
    legalDataType: LegalDataType;
}

export default async function LegalPageServer({ legalDataType }: LegalPageServerProps) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LegalPageClient legalDataType={legalDataType}/>
        </Suspense>
    )
}