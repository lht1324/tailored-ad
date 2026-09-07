import { getCloudflareContext } from "@opennextjs/cloudflare";

async function getWaitUntil(): Promise<((promise: Promise<unknown>) => void) | null> {
    try {
        const { ctx } = await getCloudflareContext();
        return (promise: Promise<unknown>) => ctx.waitUntil(promise);
    } catch {
        // Local dev or non-Cloudflare runtime: no lifetime extension available.
        // The fetch below still runs; only the guarantee is skipped.
        return null;
    }
}

export function internalFireAndForgetFetch(url: string, options: RequestInit = {}, body?: unknown) {
    const fetchPromise = fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET!,
        },
        body: JSON.stringify(body, null, 2),
    }).catch(error => {
        console.error(`[Internal Fetch Error] ${url}:`, error);
    });

    void getWaitUntil()
        .then((waitUntil) => waitUntil?.(fetchPromise))
        .catch(() => {});
}
