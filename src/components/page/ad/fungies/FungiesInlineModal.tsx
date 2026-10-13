'use client'

import { memo, useEffect } from "react";
import { X } from "lucide-react";
import type { FungiesCheckoutApi } from "@/components/page/ad/fungies/useFungies";
import { FUNGIES_CUSTOM_FIELD_USER_ID } from "@/lib/fungies";

interface FungiesInlineModalProps {
    fungies: FungiesCheckoutApi;
    checkoutUrl: string;
    userEmail?: string | null;
    /** 웹훅 매칭용 — customFields user_id로 전달 (대시보드에 동일 Key 정의 필요) */
    customUserId?: string | null;
    /** 첫주문 할인 코드 — 미확정이면 null (열기 시 미전달) */
    discountCode?: string | null;
    planName: string;
    /** 정가 (USD 숫자) — 취소선 + THEN 라인용 */
    basePrice: number;
    imagesLabel: string;
    /** 클라 판정 첫달가 — 있을 때만 할인 표시 (Pricing 카드와 동일 문법) */
    firstCharge?: number | null;
    onClose: () => void;
}

const FRAME_TARGET = "fungies-inline-frame";

/**
 * Fungies 인라인 체크아웃 모달 — 껍데기는 우리 디자인, 폼만 Fungies(embed).
 * PaddleInlineModal과 동일 껍데기 (주문 요약 + 첫달 표시 유지).
 * MoR 푸터 가시성 규정에 따라 프레임 하단을 자르지 않는다 (스크롤 허용).
 */
function FungiesInlineModal({ fungies, checkoutUrl, userEmail, customUserId, discountCode, planName, basePrice, imagesLabel, firstCharge, onClose }: FungiesInlineModalProps) {
    useEffect(() => {
        fungies.Checkout.open({
            checkoutUrl,
            settings: {
                mode: 'embed',
                frameTarget: FRAME_TARGET,
            },
            ...(userEmail ? { customerEmail: userEmail } : {}),
            ...(customUserId ? { customFields: { [FUNGIES_CUSTOM_FIELD_USER_ID]: customUserId } } : {}),
            ...(discountCode ? { discountCode } : {}),
        });
    }, [fungies, checkoutUrl, userEmail, customUserId, discountCode]);

    const onClickClose = () => {
        try {
            fungies.Checkout.close();
        } catch {
            /* 이미 닫힘 — 무시 */
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl">
                <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
                    <p className="text-[15px] font-bold tracking-tight text-text1">
                        Checkout
                    </p>
                    <button
                        onClick={onClickClose}
                        className="rounded-full p-2 text-text2 transition-colors hover:bg-canvas hover:text-text1"
                        aria-label="Close checkout"
                    >
                        <X className="h-5 w-5" strokeWidth={2} />
                    </button>
                </div>
                <div className="overflow-y-auto px-6 py-4">
                    <div className="mb-4 rounded-xl border border-hairline bg-canvas p-4">
                        <div className="flex items-center justify-between gap-3">
                            <p className="text-[15px] font-bold text-text1">{planName}</p>
                            {firstCharge != null && (
                                <span className="whitespace-nowrap rounded-full border border-accent px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-accent">
                                    −50% first month
                                </span>
                            )}
                        </div>
                        <div className="mt-3 flex items-baseline gap-1.5">
                            {firstCharge != null ? (
                                <>
                                    <span className="text-xl font-medium text-text2/60 line-through">
                                        ${basePrice}
                                    </span>
                                    <span className="text-3xl font-bold tracking-tight text-text1">
                                        ${firstCharge.toFixed(2)}
                                    </span>
                                </>
                            ) : (
                                <span className="text-3xl font-bold tracking-tight text-text1">
                                    ${basePrice}
                                </span>
                            )}
                            <span className="text-[13px] font-medium text-text2">/ mo</span>
                        </div>
                        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                            {imagesLabel}
                        </p>
                        {firstCharge != null && (
                            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-text2">
                                then ${basePrice.toFixed(2)}/mo
                            </p>
                        )}
                    </div>
                    <div id={FRAME_TARGET} />
                </div>
            </div>
        </div>
    );
}

export default memo(FungiesInlineModal);
