import {
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireServerEnv } from "@/lib/serverEnv";

/**
 * R2 서버 전용 헬퍼 — S3 규격으로 Cloudflare R2를 본다 (AWS 아님).
 * 키 규칙({user_id}/{batch_id}/…·{user_id}/profile/…)은 imageServerAPI가 소유.
 * 서명 URL 만료는 Supabase 시절과 동일한 24시간.
 */

const PRESIGN_EXPIRES_SECONDS = 60 * 60 * 24;

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

async function getR2(): Promise<{ client: S3Client; bucket: string }> {
    if (!cachedClient || !cachedBucket) {
        const endpoint = await requireServerEnv('CLOUDFLARE_R2_ENDPOINT');
        const accessKeyId = await requireServerEnv('CLOUDFLARE_R2_ACCESS_KEY_ID');
        const secretAccessKey = await requireServerEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY');
        cachedBucket = await requireServerEnv('CLOUDFLARE_R2_BUCKET');
        cachedClient = new S3Client({
            region: 'auto',
            endpoint,
            credentials: { accessKeyId, secretAccessKey },
        });
    }
    return { client: cachedClient, bucket: cachedBucket };
}

function toBytes(data: ArrayBuffer | Uint8Array): Uint8Array {
    return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export const r2ServerAPI = {
    /** 업로드 — upsert 고정 */
    async putObject(key: string, data: ArrayBuffer | Uint8Array, contentType: string): Promise<void> {
        const { client, bucket } = await getR2();
        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: toBytes(data),
            ContentType: contentType,
        }));
    },

    /** 읽기용 서명 URL — Replicate·프록시·브라우저가 직접 읽는다 */
    async presignGet(key: string, expiresInSeconds: number = PRESIGN_EXPIRES_SECONDS): Promise<string> {
        const { client, bucket } = await getR2();
        return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), {
            expiresIn: expiresInSeconds,
        });
    },

    /** prefix 아래 키 목록 (파일명만, prefix 제거) */
    async listKeys(prefix: string): Promise<string[]> {
        const { client, bucket } = await getR2();
        const names: string[] = [];
        let continuationToken: string | undefined;
        do {
            const result = await client.send(new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }));
            for (const obj of result.Contents ?? []) {
                if (obj.Key) names.push(obj.Key);
            }
            continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
        } while (continuationToken);
        return names.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k));
    },

    /** 삭제 — 빈 배열이면 no-op */
    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        const { client, bucket } = await getR2();
        await client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
        }));
    },
};
