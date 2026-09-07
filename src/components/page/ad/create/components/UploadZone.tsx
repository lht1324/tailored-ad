'use client'

import { memo, useRef, useState, useCallback } from 'react';
import { ImagePlus, Info, X, Check, ChevronDown, Plus } from 'lucide-react';
import { AdUploadedComponent } from "@/lib/api/client/ad/adClientAPI";

interface UploadZoneProps {
    label: string;
    help?: string;
    notePlaceholder?: string;
    tall?: boolean;
    file: AdUploadedComponent | null;
    onChange: (file: AdUploadedComponent | null) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const NOTE_CHIPS = ['Remove background', 'Keep natural light', 'Soft shadow'];

function UploadZone({ label, help, notePlaceholder, tall, file, onChange }: UploadZoneProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isNoteOpen, setIsNoteOpen] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFiles = useCallback(
        (files: FileList | null) => {
            const file = files?.[0];
            if (!file) {
                return;
            }
            if (!ACCEPTED_TYPES.includes(file.type)) {
                setUploadError('Please upload a JPG, PNG, or WebP image.');
                return;
            }
            if (file.size > MAX_FILE_SIZE) {
                setUploadError('File is too large. Keep it under 10 MB.');
                return;
            }
            setUploadError(null);

            const objectUrl = URL.createObjectURL(file);
            const image = new Image();
            image.onload = () => {
                onChange({
                    id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    fileName: file.name,
                    previewUrl: objectUrl,
                    width: image.naturalWidth,
                    height: image.naturalHeight,
                    file,
                });
            };
            image.src = objectUrl;
        },
        [onChange],
    );

    const onClickRemove = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            setUploadError(null);
            onChange(null);
        },
        [onChange],
    );

    const hasNote = Boolean(file?.note?.trim());

    const onClickNoteToggle = useCallback(() => {
        setIsNoteOpen((current) => !current);
    }, []);

    const onClickChip = useCallback((chip: string) => {
        if (!file) return;
        const current = file.note?.trim() ? `${file.note.trim()} ` : '';
        const next = `${current}${chip}`;
        onChange({ ...file, note: next });
    }, [file, onChange]);

    return (
        <div className="group relative flex flex-1 flex-col min-h-0">
            <div className="mb-2 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-medium text-text1">{label}</span>
                    {help && (
                        <button
                            type="button"
                            aria-label={`About ${label}`}
                            className="rounded-full p-0.5 text-text2/70 transition-colors hover:bg-surface hover:text-text1"
                        >
                            <Info className="h-3 w-3" strokeWidth={2} />
                        </button>
                    )}
                </div>
                {file && (
                    <span className="flex items-center gap-1 text-[11px] text-text2">
                        <Check className="h-3 w-3 text-accent" strokeWidth={2.4} />
                        ready
                    </span>
                )}
            </div>

            {help && !file && (
                <div
                    role="tooltip"
                    className="pointer-events-none absolute left-0 top-full z-20 mt-2 w-60 rounded-xl border border-hairline bg-surface p-3 text-[12px] leading-relaxed text-text2 shadow-lg shadow-black/20 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 invisible"
                >
                    {help}
                </div>
            )}

            {file ? (
                <div className="flex flex-1 min-h-[10rem] items-center gap-3 rounded-xl border border-hairline bg-canvas p-4">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={file.previewUrl} alt={file.fileName} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-text1">{file.fileName}</p>
                        <p className="mt-0.5 text-[11px] text-text2">
                            ready{file.width && file.height ? ` · ${file.width}×${file.height}` : ''}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClickRemove}
                        className="rounded-full p-1.5 text-text2 transition-colors hover:bg-surface hover:text-text1"
                        aria-label={`Remove ${label}`}
                    >
                        <X className="h-4 w-4" strokeWidth={2} />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(event) => {
                        event.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                        handleFiles(event.dataTransfer.files);
                    }}
                    className={`flex w-full items-center justify-center gap-2.5 rounded-xl border border-dashed px-4 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                        tall ? 'flex-1 min-h-[10rem] flex-col py-8 sm:py-10' : 'py-2.5'
                    } ${
                        isDragging ? 'border-accent bg-surface' : 'border-hairline hover:border-text2/50'
                    }`}
                >
                    <ImagePlus
                        className={`shrink-0 text-text2 transition-colors ${
                            tall ? 'h-5 w-5' : 'h-4 w-4'
                        }`}
                        strokeWidth={1.8}
                    />
                    <span className={`truncate text-[13px] text-text2 ${tall ? 'mt-1' : ''}`}>
                        Drop an image or <span className="text-text1 underline underline-offset-2">browse</span>
                    </span>
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                    handleFiles(event.target.files);
                    event.target.value = '';
                }}
            />

            {uploadError && !file && (
                <p className="mt-2 text-[12px] leading-relaxed text-[#F87171]">{uploadError}</p>
            )}

            {file && notePlaceholder && (
                <div className="relative mt-2">
                    <button
                        type="button"
                        onClick={onClickNoteToggle}
                        aria-expanded={isNoteOpen}
                        className="flex w-full items-center justify-between gap-2 rounded-full border border-hairline bg-canvas px-3 py-2 text-[12px] transition-colors hover:border-text2/30"
                    >
                        <span className="flex min-w-0 flex-1 items-center gap-2 truncate">
                            {hasNote ? (
                                <>
                                    <span className="truncate text-text1">{file.note}</span>
                                    <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent">note</span>
                                </>
                            ) : (
                                <>
                                    <Plus className="h-3 w-3 shrink-0 text-text2" strokeWidth={2} />
                                    <span className="truncate text-text2">Add note</span>
                                    <span className="shrink-0 rounded-full border border-hairline bg-surface px-1.5 py-0.5 text-[10px] font-medium text-text2">optional</span>
                                    <span className="hidden sm:inline shrink-0 text-[11px] text-text2/60">· leave empty to skip</span>
                                </>
                            )}
                        </span>
                        <ChevronDown
                            className={`h-3.5 w-3.5 shrink-0 text-text2 transition-transform duration-200 ${
                                isNoteOpen ? 'rotate-180' : ''
                            }`}
                            strokeWidth={2}
                        />
                    </button>
                    {isNoteOpen && (
                        <div className="absolute left-0 right-0 top-full z-20 mt-2 rounded-xl border border-hairline bg-surface p-3 shadow-xl">
                            <textarea
                                autoFocus={!hasNote}
                                value={file.note ?? ''}
                                onChange={(event) => {
                                    onChange({
                                        ...file,
                                        note: event.target.value ? event.target.value : undefined,
                                    });
                                }}
                                placeholder={notePlaceholder}
                                rows={2}
                                className="w-full min-h-[4.5rem] max-h-[7rem] resize-none rounded-lg border border-hairline bg-canvas px-3 py-2 text-[12px] leading-relaxed text-text1 placeholder:text-text2/60 focus:border-text2/40 focus:outline-none"
                            />
                            <div className="mt-2 flex flex-wrap gap-1.5">
                                {NOTE_CHIPS.map((chip) => (
                                    <button
                                        key={chip}
                                        type="button"
                                        onClick={() => onClickChip(chip)}
                                        className="rounded-full border border-hairline bg-canvas px-2.5 py-1 text-[11px] text-text2 hover:border-text2/30 hover:text-text1"
                                    >
                                        + {chip}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-3 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange({ ...file, note: undefined });
                                        setIsNoteOpen(false);
                                    }}
                                    className="rounded-full px-3 py-1.5 text-[11px] text-text2 hover:bg-canvas"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsNoteOpen(false)}
                                    className="rounded-full bg-text1 px-4 py-1.5 text-[11px] font-medium text-canvas"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default memo(UploadZone);
