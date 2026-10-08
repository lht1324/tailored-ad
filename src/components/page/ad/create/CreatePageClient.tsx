'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import AppHeader from "@/components/page/ad/app-header/AppHeader";
import CreateForm from "@/components/page/ad/create/components/CreateForm";
import {
    AdAspectRatio,
    AdUploadedComponent,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";
import { adProjectClientAPI, BalanceExhaustedError } from "@/lib/api/client/ad/adProjectClientAPI";
import { usersClientAPI } from "@/lib/api/client/usersClientAPI";
import { downscaleImageFile } from "@/lib/imageResize";

function inferFileExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'png';
    if (ext === 'jpg') return 'jpeg';
    if (['jpeg', 'png', 'webp'].includes(ext)) return ext;
    return 'png';
}

/** 공식 로고 프리필 식별자 — 수동 업로드(upload-…)와 구분용 */
const OFFICIAL_LOGO_ID = 'official-logo';
const OFFICIAL_LOGO_MAX_BYTES = 10 * 1024 * 1024;

export default function CreatePageClient() {
    const router = useRouter();

    // 구성 요소 — background는 AI가 creative마다 생성
    const [product, setProduct] = useState<AdUploadedComponent | null>(null);
    // PERSONA_MODE (2026-09-24): 실사 인물 업로드를 AI 페르소나 생성으로 대체.
    // 아래 person state·전송부는 Enterprise 실사 부활용으로 주석 보존 (삭제 금지).
    // 부활 시: 주석 해제 + CreateForm person 셀 복원 + image/route 실파일 분기(存置) 사용.
    // const [person, setPerson] = useState<AdUploadedComponent | null>(null);
    const [brandLogo, setBrandLogo] = useState<AdUploadedComponent | null>(null);
    /** 공식 로고 사용 가능 여부 — {user_id}/profile/brand_logo.* 다운로드·캐시 성공 시 true */
    const [officialLogoAvailable, setOfficialLogoAvailable] = useState(false);
    const officialFileRef = useRef<{ fileName: string; file: File; width: number; height: number } | null>(null);
    const didPrefillRef = useRef(false);

    // AI 모델(페르소나) 사용 여부 + brief — 인물 포함 배치 신호
    const [personaEnabled, setPersonaEnabled] = useState(false);
    const [personaBrief, setPersonaBrief] = useState('');

    // 공식 로고 프리필 — 진입 시 1회. 받아온 파일을 기존 brandLogo 상태에 그대로
    // 넣어주므로 제출·서버·파이프라인은 수동 업로드와 완전히 동일하게 탄다.
    useEffect(() => {
        if (didPrefillRef.current) return;
        didPrefillRef.current = true;
        let cancelled = false;
        const prefill = async () => {
            const profile = await usersClientAPI.getProfileLogo();
            if (cancelled || !profile) return;
            try {
                const response = await fetch(profile.signedUrl);
                if (!response.ok) return;
                const blob = await response.blob();
                if (cancelled) return;
                if (!blob.type.startsWith('image/') || blob.size > OFFICIAL_LOGO_MAX_BYTES) return;
                const file = new File([blob], profile.fileName, { type: blob.type });
                const previewUrl = URL.createObjectURL(file);
                const dims = await new Promise<{ width: number; height: number }>((resolve) => {
                    const image = new Image();
                    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
                    image.onerror = () => resolve({ width: 0, height: 0 });
                    image.src = previewUrl;
                });
                if (cancelled) return;
                officialFileRef.current = { fileName: profile.fileName, file, width: dims.width, height: dims.height };
                setOfficialLogoAvailable(true);
                setBrandLogo({
                    id: OFFICIAL_LOGO_ID,
                    fileName: profile.fileName,
                    previewUrl,
                    ...(dims.width > 0 ? { width: dims.width, height: dims.height } : {}),
                    file,
                });
            } catch {
                // 프리필 실패는 조용히 스킵 — 수동 업로드 경로 유지
            }
        };
        void prefill();
        return () => {
            cancelled = true;
        };
    }, []);

    const brandLogoIsOfficial = useMemo(() => brandLogo?.id === OFFICIAL_LOGO_ID, [brandLogo]);

    const onBrandLogoChange = useCallback((next: AdUploadedComponent | null) => {
        setBrandLogo(next);
    }, []);

    const onUseOfficialLogo = useCallback(() => {
        const cached = officialFileRef.current;
        if (!cached) return;
        setBrandLogo({
            id: OFFICIAL_LOGO_ID,
            fileName: cached.fileName,
            previewUrl: URL.createObjectURL(cached.file),
            ...(cached.width > 0 ? { width: cached.width, height: cached.height } : {}),
            file: cached.file,
        });
    }, []);

    // 생성 옵션
    const [aspectRatios, setAspectRatios] = useState<AdAspectRatio[]>(['1:1']);
    const [conceptCount, setConceptCount] = useState(4);
    const [ctaEnabled, setCtaEnabled] = useState(false);
    const [brandPalette, setBrandPalette] = useState<string[] | null>(null);

    // 생성 진행
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showUpsell, setShowUpsell] = useState(false);

    const hasSubject = useMemo(() => product !== null || personaEnabled, [product, personaEnabled]);

    const canGenerate = useMemo(
        () => hasSubject && aspectRatios.length > 0 && !isGenerating,
        [hasSubject, aspectRatios, isGenerating],
    );

    const totalImages = useMemo(() => aspectRatios.length * conceptCount, [aspectRatios, conceptCount]);

    const onClickGenerate = useCallback(async () => {
        if (!hasSubject || isGenerating) return;

        setError(null);
        setIsGenerating(true);

        try {
            const validPalette = brandPalette && brandPalette.length >= 3 && brandPalette.length <= 5 ? brandPalette : null;

            const productImage = product
                ? {
                      imageFileExtension: inferFileExtension(product.fileName),
                      note: product.note,
                  }
                : null;

            const personImage = null;
            // PERSONA_MODE: 실사 전송부 주석 보존 (Enterprise 부활용)
            // const personImage = person
            //     ? {
            //           imageFileExtension: inferFileExtension(person.fileName),
            //           note: person.note,
            //       }
            //     : null;

            const brandLogoImage = brandLogo
                ? {
                      imageFileExtension: inferFileExtension(brandLogo.fileName),
                  }
                : null;

            // 생성 + 원본 업로드를 multipart 1요청으로 (서버가 생성→업로드→specs 순 처리).
            // 전송 전에 긴 변 1024px로 다운스케일 (미리보기는 원본 유지, 실제 전송만 축소).
            // 근거: Gemini 768 타일·Flux 입력 1MP 상한·Replicate 입력 $0.014/MP
            const [productFile, logoFile] = await Promise.all([
                product?.file ? downscaleImageFile(product.file) : null,
                brandLogo?.file ? downscaleImageFile(brandLogo.file) : null,
            ]);
            // PERSONA_MODE: 실사 전송부 주석 보존 (Enterprise 부활용)
            // person?.file ? downscaleImageFile(person.file) : null,
            const personFile = null;
            const { batchId } = await adProjectClientAPI.createProject({
                productImage,
                personImage,
                brandLogo: brandLogoImage,
                aspectRatios,
                conceptCount,
                ctaEnabled,
                brandPalette: validPalette,
                personaBrief: personaEnabled ? personaBrief : undefined,
            }, {
                product: productFile,
                person: personFile,
                brandLogo: logoFile,
            });

            router.push(`/projects/${batchId}`);
        } catch (err) {
            if (err instanceof BalanceExhaustedError) {
                setShowUpsell(true);
                setIsGenerating(false);
                return;
            }
            setError(err instanceof Error ? err.message : 'Failed to start generation. Please try again.');
            setIsGenerating(false);
        }
    }, [hasSubject, isGenerating, product, personaEnabled, personaBrief, brandLogo, aspectRatios, conceptCount, ctaEnabled, brandPalette, router]);

    const hintText = !hasSubject
        ? 'Add a product or cast a virtual model to start. The AI paints a different background for each creative.'
        : 'Ready. Each creative gets its own AI background. Success assets only are credited.';

    return (
        <>
            <AppHeader />

            {/* 헤더(top-4) / 바(bottom-4) 고정, 사이는 남은 높이를 fr로 나눠 꽉 채움 */}
            <main className="mx-auto flex min-h-[100dvh] w-full max-w-[90rem] flex-col px-6 pb-28 pt-28 sm:px-8">
                <div className="flex flex-1 flex-col gap-4 py-2 min-h-0">
                    <div className="shrink-0">
                        <h1 className="text-2xl font-bold tracking-tight text-text1">Create your ad</h1>
                        <p className="mt-1 text-[12px] text-text2">
                            Upload your product, pick where it runs, and generate.
                        </p>
                    </div>

                    <div className="flex flex-1 flex-col min-h-0">
                        <CreateForm
                            product={product}
                            brandLogo={brandLogo}
                            onProductChange={setProduct}
                            onBrandLogoChange={onBrandLogoChange}
                            brandLogoIsOfficial={brandLogoIsOfficial}
                            officialLogoAvailable={officialLogoAvailable}
                            onUseOfficialLogo={onUseOfficialLogo}
                            personaEnabled={personaEnabled}
                            personaBrief={personaBrief}
                            onPersonaEnabledChange={setPersonaEnabled}
                            onPersonaBriefChange={setPersonaBrief}
                            aspectRatios={aspectRatios}
                            conceptCount={conceptCount}
                            ctaEnabled={ctaEnabled}
                            brandPalette={brandPalette}
                            onAspectRatiosChange={setAspectRatios}
                            onConceptCountChange={setConceptCount}
                            onCtaEnabledChange={setCtaEnabled}
                            onBrandPaletteChange={setBrandPalette}
                        />
                    </div>

                    {error && (
                        <p className="shrink-0 rounded-xl border border-hairline bg-surface px-3.5 py-3 text-[12px] leading-relaxed text-[#F87171]">
                            {error}
                        </p>
                    )}
                </div>
            </main>

            {/* 하단 바 — fixed bottom-4, 헤더와 대칭 */}
            <div className="fixed inset-x-0 bottom-4 z-30 px-6 sm:px-8">
                <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-6 rounded-2xl border border-hairline bg-surface px-5 py-3 shadow-xl shadow-black/10">
                    <div className="min-w-0">
                        <p className="text-[13px] font-medium text-text1">
                            {conceptCount} creative{conceptCount > 1 ? 's' : ''} × {aspectRatios.length}{' '}
                            format{aspectRatios.length > 1 ? 's' : ''} = {totalImages} asset
                            {totalImages > 1 ? 's' : ''} · success only credited
                        </p>
                        <p className="mt-0.5 text-[12px] leading-relaxed text-text2">{hintText}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClickGenerate}
                        disabled={!canGenerate}
                        className="w-[240px] shrink-0 inline-flex items-center justify-center gap-2 rounded-full bg-text1 px-6 py-3.5 text-[14px] font-semibold text-canvas transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100"
                    >
                        {isGenerating && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
                        Generate {totalImages} asset{totalImages > 1 ? 's' : ''}
                    </button>
                </div>
            </div>

            {showUpsell && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
                    <div className="w-full max-w-sm rounded-2xl border border-hairline bg-surface p-8 text-center">
                        <h2 className="text-xl font-bold tracking-tight text-text1">Out of images</h2>
                        <p className="mt-3 text-[14px] leading-relaxed text-text2">
                            You&apos;ve used all your images, including the free trial.
                            Subscribe to keep creating. Unused images never expire.
                        </p>
                        <button
                            type="button"
                            onClick={() => router.push('/#pricing')}
                            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-text1 px-6 py-3 text-[14px] font-semibold text-canvas"
                        >
                            View plans
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowUpsell(false)}
                            className="mt-3 inline-flex w-full items-center justify-center rounded-full px-6 py-2.5 text-[13px] font-medium text-text2"
                        >
                            Not now
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}