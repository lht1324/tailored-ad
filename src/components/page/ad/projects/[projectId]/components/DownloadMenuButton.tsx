'use client';

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Download, Image as ImageIcon, Loader2, Type } from 'lucide-react';

export interface DownloadMenuItem {
    key: string;
    label: string;
    hint?: string;
    icon: 'text' | 'image';
    disabled?: boolean;
    onSelect: () => void;
}

interface DownloadMenuButtonProps {
    items: DownloadMenuItem[];
    label?: string;
    disabled?: boolean;
    busy?: boolean;
    busyLabel?: string;
    align?: 'left' | 'right';
    size?: 'md' | 'sm';
}

/**
 * 스플릿 다운로드 버튼 — 메인 클릭은 첫 항목(합성본), chevron으로 원본 선택.
 * 헤더 벌크(ZIP) + 모달 낱장 공용. 아이콘은 의미 전달용 (Type=글씨 포함, Image=원본).
 */
function DownloadMenuButton({ items, label = 'Download', disabled, busy, busyLabel, align = 'right', size = 'md' }: DownloadMenuButtonProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const primary = items[0];

    const onClickMain = useCallback(() => {
        if (!primary || busy || primary.disabled) return;
        primary.onSelect();
    }, [primary, busy]);

    const onClickChevron = useCallback(() => {
        if (disabled || busy) return;
        setOpen((v) => !v);
    }, [disabled, busy]);

    const onClickItem = useCallback((item: DownloadMenuItem) => {
        if (item.disabled) return;
        setOpen(false);
        item.onSelect();
    }, []);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open ]);

    const pad = size === 'md' ? 'px-4 py-2 text-[13px]' : 'px-4 py-1.5 text-[12px]';
    const iconCls = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

    return (
        <div ref={rootRef} className="relative">
            <div className={`flex items-stretch overflow-hidden rounded-full bg-text1 text-canvas transition-transform hover:scale-[1.02] active:scale-[0.98] ${disabled || busy ? 'pointer-events-none opacity-50' : ''}`}>
                <button
                    type="button"
                    onClick={onClickMain}
                    disabled={disabled || busy || primary?.disabled}
                    className={`inline-flex items-center gap-2 font-semibold ${pad} hover:opacity-90 disabled:opacity-50`}
                >
                    {busy ? <Loader2 className={`${iconCls} animate-spin`} strokeWidth={1.8} /> : <Download className={iconCls} strokeWidth={1.8} />}
                    {busy && busyLabel ? busyLabel : label}
                </button>
                <span aria-hidden="true" className="w-px self-stretch bg-canvas/30" />
                <button
                    type="button"
                    onClick={onClickChevron}
                    disabled={disabled || busy}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="Download options"
                    className="inline-flex items-center px-2.5 hover:opacity-90 disabled:opacity-50"
                >
                    <ChevronDown className={`${iconCls} transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2} />
                </button>
            </div>
            {open && (
                <div
                    role="menu"
                    className={`absolute top-full z-50 mt-1.5 w-56 overflow-hidden rounded-2xl border border-hairline bg-surface p-1 shadow-xl ${align === 'right' ? 'right-0' : 'left-0'}`}
                >
                    {items.map((item) => (
                        <button
                            key={item.key}
                            type="button"
                            role="menuitem"
                            onClick={() => onClickItem(item)}
                            disabled={item.disabled}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-canvas disabled:opacity-40"
                        >
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-hairline bg-canvas text-text2">
                                {item.icon === 'text'
                                    ? <Type className="h-4 w-4" strokeWidth={1.8} />
                                    : <ImageIcon className="h-4 w-4" strokeWidth={1.8} />}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] font-medium text-text1">{item.label}</span>
                                {item.hint && <span className="mt-0.5 block truncate font-mono text-[10px] text-text2">{item.hint}</span>}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default memo(DownloadMenuButton);
