'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { fontMap } from "@/lib/fonts";

/**
 * 폰트 피커 — 네이티브 select는 option별 font-family를 무시해서 커스텀.
 * 각 행을 자기 폰트로 렌더 (Canva식). 목록이 열릴 때만 폰트를 받아옴.
 */
interface FontPickerProps {
    value: string | null;
    disabled?: boolean;
    onChange: (name: string) => void;
}

function FontPicker({ value, disabled, onChange }: FontPickerProps) {
    const [open, setOpen] = useState(false);
    const [highlight, setHighlight] = useState(0);
    const rootRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const names = useMemo(() => Object.keys(fontMap), []);

    const onClickToggle = useCallback(() => {
        if (disabled) return;
        setHighlight(Math.max(0, names.indexOf(value ?? '')));
        setOpen((v) => !v);
    }, [disabled, names, value]);

    const onClickSelect = useCallback((name: string) => {
        onChange(name);
        setOpen(false);
    }, [onChange]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', onPointerDown);
        return () => document.removeEventListener('pointerdown', onPointerDown);
    }, [open ]);

    useEffect(() => {
        if (!open) return;
        listRef.current?.children[highlight]?.scrollIntoView({ block: 'nearest' });
    }, [highlight, open ]);

    const onKeyDownList = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setOpen(false);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, names.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            const name = names[highlight];
            if (name) {
                onChange(name);
                setOpen(false);
            }
        }
    }, [names, highlight, onChange]);

    const currentStack = value ? fontMap[value]?.style.fontFamily : undefined;

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                onClick={onClickToggle}
                onKeyDown={(e) => {
                    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onClickToggle();
                    }
                }}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Font family"
                className="flex w-full items-center justify-between gap-2 rounded-xl border border-hairline bg-canvas px-3 py-2.5 text-left outline-none transition-colors focus:border-accent disabled:opacity-40"
            >
                <span className="min-w-0 flex-1 truncate text-[13px] text-text1" style={{ fontFamily: currentStack }}>
                    {value ?? 'Select font'}
                </span>
                <ChevronDown className={`h-4 w-4 shrink-0 text-text2 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={1.8} />
            </button>
            {open && (
                <div
                    ref={listRef}
                    role="listbox"
                    aria-label="Font family"
                    onKeyDown={onKeyDownList}
                    className="absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-hairline bg-surface p-1 shadow-xl"
                >
                    {names.map((name, i) => (
                        <button
                            key={name}
                            type="button"
                            role="option"
                            aria-selected={name === value}
                            onClick={() => onClickSelect(name)}
                            onMouseEnter={() => setHighlight(i)}
                            className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition-colors ${
                                i === highlight ? 'bg-canvas' : ''
                            }`}
                        >
                            <span className="min-w-0 flex-1 truncate text-[13px] text-text1" style={{ fontFamily: fontMap[name].style.fontFamily }}>
                                {name}
                            </span>
                            {name === value && <Check className="h-4 w-4 shrink-0 text-accent" strokeWidth={2.2} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default memo(FontPicker);
