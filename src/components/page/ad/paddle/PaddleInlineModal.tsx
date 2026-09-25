'use client'

import { memo, useEffect } from "react";
import { X } from "lucide-react";
import type { Paddle } from "@paddle/paddle-js";

interface PaddleInlineModalProps {
    paddle: Paddle;
    transactionId: string;
    userEmail?: string | null;
    planName: string;
    /** 정가 (USD 숫자) — 취소선 + THEN 라인용 */
    basePrice: number;
    imagesLabel: string;
    /** 서버 판정 첫달가 — 있을 때만 할인 표시 (Pricing 카드와 동일 문법) */
    firstCharge?: number | null;
    onClose: () => void;
}

const FRAME_TARGET = "paddle-inline-frame";

/**
 * Paddle 인라인 체크아웃 모달 — 껍데기는 우리 디자인, 폼만 Paddle.
 * 오버레이 경로와 병존 (복구 시 호출부 1줄 교체). frameTarget div가 마운트된 뒤 open.
 * MoR 푸터 가시성 규정에 따라 프레임 하단을 자르지 않는다 (스크롤 허용).
 */
function PaddleInlineModal({ paddle, transactionId, userEmail, planName, basePrice, imagesLabel, firstCharge, onClose }: PaddleInlineModalProps) {
    useEffect(() => {
        paddle.Checkout.open({
            transactionId,
            ...(userEmail ? { customer: { email: userEmail } } : {}),
            settings: {
                displayMode: 'inline',
                variant: 'one-page',
                frameTarget: FRAME_TARGET,
                frameInitialHeight: 650,
                frameStyle: 'width: 100%; min-width: 286px; background-color: transparent; border: none;',
            },
        });
    }, [paddle, transactionId, userEmail]);

    const onClickClose = () => {
        try {
            paddle.Checkout.close();
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
                    <div className={FRAME_TARGET} />
                </div>
            </div>
        </div>
    );
}

export default memo(PaddleInlineModal);
