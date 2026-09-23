'use client'

import { memo } from "react";

interface DefaultModalProps {
    title: string;
    message?: string;
    confirmText?: string;
    cancelText: string;
    onClickConfirm?: () => void;
    onClickCancel: () => void;
}

function DefaultModal({
    title,
    message,
    confirmText,
    cancelText = "Cancel",
    onClickConfirm,
    onClickCancel,
}: DefaultModalProps) {
    return (
        <div
            onClick={onClickCancel}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="mx-4 w-full max-w-md overflow-hidden rounded-2xl border border-hairline bg-surface shadow-2xl"
            >
                <div className="p-8">
                    <h3 className="mb-3 text-xl font-bold text-text1">
                        {title}
                    </h3>
                    {message && <p className="mb-8 text-sm leading-relaxed whitespace-pre-line text-text2">
                        {message}
                    </p>}
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            onClick={onClickCancel}
                            className="rounded-xl px-5 py-2.5 text-sm font-bold text-text2 transition-all hover:bg-canvas hover:text-text1"
                        >
                            {cancelText}
                        </button>
                        {confirmText && onClickConfirm && (
                            <button
                                onClick={onClickConfirm}
                                className="rounded-xl bg-text1 px-5 py-2.5 text-sm font-bold text-canvas transition-all hover:opacity-90"
                            >
                                {confirmText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(DefaultModal);
