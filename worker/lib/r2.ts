import { AwsClient } from "aws4fetch";
import { getServerEnv, requireServerEnv } from "@worker/lib/serverEnv";

/**
 * R2 서버 전용 헬퍼 — **S3 규격 + aws4fetch** (10-31 교체).
 *
 * ## 왜 AWS SDK를 뺐나
 * `@smithy/core@3.38.1`의 `package.json`이 `browser` 필드에서 `*.browser.js`를 가리키는데
 * **그 파일이 배포본에 없다.** 그래서 `S3Client`를 만드는 순간 `emitWarningIfUnsupportedVersion
 * is not a function`으로 죽었다 (dev·build 둘 다).
 *
 * ## Cloudflare 권장 (R2 문서)
 * > The R2 Workers API binding **cannot generate presigned URLs**, so you must sign them with an
 * > S3 client. Inside a Worker, you can use **`aws4fetch`**, a small library built on `fetch` and
 * > `SubtleCrypto`, or the AWS SDK for JavaScript v3.
 *
 * 즉 서명 URL이 필요한 우리 경우 **`aws4fetch`가 1순위 권장 경로**다.
 * (바인딩은 읽기/쓰기 전용이고 presign을 못 한다)
 *
 * ## 버킷 선택
 * base 이름에 dev 접미사를 붙인다 (구 프로젝트 관례 유지).
 * - prod: `CLOUDFLARE_R2_BUCKET`
 * - dev : `CLOUDFLARE_R2_BUCKET` + `-dev`
 *
 * ## 키 규칙
 * `{user_id}/{batch_id}/…` · `{user_id}/profile/…` — 조립은 `imageServerAPI`가 소유한다.
 */

const PRESIGN_EXPIRES_SECONDS = 60 * 60 * 24; // 24시간 (Supabase 시절과 동일)

/** 객체 키 1개 = 경로 세그먼트. S3 경로에 그대로 붙으므로 세그먼트별 인코딩한다. */
function encodeKeyPath(key: string): string {
    return key.split("/").map(encodeURIComponent).join("/");
}

interface R2Context {
    client: AwsClient;
    /** 예: `https://<account>.r2.cloudflarestorage.com/<bucket>` (끝 슬래시 없음) */
    baseUrl: string;
}

let cached: R2Context | null = null;

async function getR2(): Promise<R2Context> {
    if (cached) return cached;

    const endpoint = (await requireServerEnv("CLOUDFLARE_R2_ENDPOINT")).replace(/\/+$/, "");
    const accessKeyId = await requireServerEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
    const secretAccessKey = await requireServerEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
    // base 이름(예: tailored-ad-images). dev는 -dev 버킷. env 값에 -dev를 붙이지 말 것.
    const baseBucket = await requireServerEnv("CLOUDFLARE_R2_BUCKET");
    // ⚠️ `process.env.NODE_ENV`를 쓰지 않는다. 그건 **빌드 시점** 상수라서
    //    dev 빌드를 배포하면 prod가 -dev 버킷을 보게 된다(사고 경로).
    //    `ENVIRONMENT`는 wrangler.jsonc vars(prod) / .dev.vars(dev)에서 오는 **런타임 값**이다.
    const environment = await getServerEnv("ENVIRONMENT");
    const bucket = environment === "production" ? baseBucket : `${baseBucket}-dev`;

    cached = {
        client: new AwsClient({ service: "s3", region: "auto", accessKeyId, secretAccessKey }),
        baseUrl: `${endpoint}/${bucket}`,
    };
    return cached;
}

export const r2ServerAPI = {
    /** 업로드 — upsert 고정 (같은 키 덮어쓰기) */
    async putObject(key: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
        const { client, baseUrl } = await getR2();
        // 복사해서 ArrayBuffer를 소유한 뷰로 만든다 (BodyInit 타입 요구사항)
        const bytes = data instanceof Uint8Array ? new Uint8Array(data) : new Uint8Array(data);
        const response = await client.fetch(`${baseUrl}/${encodeKeyPath(key)}`, {
            method: "PUT",
            body: bytes,
            headers: { "Content-Type": contentType },
        });
        if (!response.ok) {
            throw new Error(`R2 putObject failed (${response.status} ${response.statusText}) key=${key}`);
        }
    },

    /** 읽기용 서명 URL — Replicate·프록시·브라우저가 직접 읽는다 */
    async presignGet(key: string, expiresInSeconds: number = PRESIGN_EXPIRES_SECONDS): Promise<string> {
        const { client, baseUrl } = await getR2();
        const signed = await client.sign(
            new Request(`${baseUrl}/${encodeKeyPath(key)}?X-Amz-Expires=${expiresInSeconds}`),
            { aws: { signQuery: true } },
        );
        return signed.url.toString();
    },

    /** prefix 아래 키 목록 (prefix 제거한 파일명) */
    async listKeys(prefix: string): Promise<string[]> {
        const { client, baseUrl } = await getR2();
        const names: string[] = [];
        let continuationToken: string | undefined;

        do {
            const params = new URLSearchParams({ "list-type": "2", prefix });
            if (continuationToken) params.set("continuation-token", continuationToken);

            const response = await client.fetch(`${baseUrl}?${params.toString()}`);
            if (!response.ok) {
                throw new Error(`R2 listKeys failed (${response.status} ${response.statusText})`);
            }

            const xml = await response.text();
            for (const match of xml.matchAll(/<Key>([^<]*)<\/Key>/g)) {
                // XML 엔티티 최소 복원 (&amp; 정도만 — 키는 ASCII 경로라 충분)
                names.push(match[1].replace(/&amp;/g, "&"));
            }

            const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml);
            const nextToken = /<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml)?.[1];
            continuationToken = truncated && nextToken ? nextToken : undefined;
        } while (continuationToken);

        return names.map((name) => (name.startsWith(prefix) ? name.slice(prefix.length) : name));
    },

    /** 삭제 — 빈 배열이면 no-op */
    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        const { client, baseUrl } = await getR2();

        // S3 DeleteObjects(multi-delete) — 1000개 단위
        for (let index = 0; index < keys.length; index += 1000) {
            const chunk = keys.slice(index, index + 1000);
            const body =
                `<Delete><Quiet>true</Quiet>` +
                chunk.map((key) => `<Object><Key>${escapeXml(key)}</Key></Object>`).join("") +
                `</Delete>`;

            const response = await client.fetch(`${baseUrl}?delete`, {
                method: "POST",
                headers: { "Content-Type": "application/xml" },
                body,
            });
            if (!response.ok) {
                throw new Error(`R2 deleteKeys failed (${response.status} ${response.statusText})`);
            }
        }
    },
};

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
