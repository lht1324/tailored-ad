'use client'

import { useCallback, useState } from 'react';
import { readCurrentUtm } from "@/lib/utm";

/**
 * 이메일 수집 폼 (10-20) — 랜딩에서 로그인 전 트래픽을 리스트로 확보.
 * UTM은 함께 저장 → "어느 채널에서 신청이 왔나"를 DB에서 바로 본다.
 *
 * 주의: 발송 파이프라인(Resend·Buttondown 등)은 아직 없음 — 지금은 수집·측정용.
 *       실제로 메일을 보내야 하면 그때 provider를 붙이면 된다.
 */
export default function EmailCaptureForm() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
    const [message, setMessage] = useState<string | null>(null);

    const onSubmitEmail = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (status === 'sending') return;
        setStatus('sending');
        setMessage(null);
        const utm = readCurrentUtm();
        try {
            const response = await fetch('/api/client-gateway?path=/api/subscribers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email.trim(),
                    source: 'pricing',
                    // 허니팟 — 사람이면 절대 안 채움
                    company: '',
                    utm_source: utm.utm_source ?? null,
                    utm_campaign: utm.utm_campaign ?? null,
                }),
            });
            const result = await response.json() as { success?: boolean; error?: string };
            if (!result.success) {
                throw new Error(result.error ?? 'Could not subscribe.');
            }
            setStatus('done');
            setMessage("You're on the list. We'll email you when new tools ship.");
            setEmail('');
        } catch (error) {
            setStatus('error');
            setMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
        }
    }, [email, status]);

    if (status === 'done') {
        return (
            <p className="rounded-2xl border border-accent/40 bg-accent/10 px-6 py-4 text-center text-[15px] font-medium text-text1">
                {message}
            </p>
        );
    }

    return (
        <form
            onSubmit={onSubmitEmail}
            className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center"
            noValidate
        >
            <label htmlFor="email-capture" className="sr-only">Email address</label>
            <input
                id="email-capture"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-12 w-full rounded-full border border-hairline bg-surface px-5 text-[15px] text-text1 outline-none transition-colors placeholder:text-text2/70 focus:border-accent sm:w-72"
            />
            <button
                type="submit"
                disabled={status === 'sending'}
                className="h-12 shrink-0 rounded-full bg-text1 px-6 text-[14px] font-semibold text-canvas transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
            >
                {status === 'sending' ? 'Saving…' : 'Keep me posted'}
            </button>
            {status === 'error' && message && (
                <p className="w-full text-center text-[13px] font-medium text-red-500 sm:w-auto" role="alert">
                    {message}
                </p>
            )}
        </form>
    );
}
