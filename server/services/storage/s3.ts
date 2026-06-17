/**
 * MinIO / S3 object storage service.
 * Uses AWS SDK v3 with custom endpoint for MinIO compatibility.
 *
 * Buckets:
 *   aether-kyc        - KYC documents (90 day retention)
 *   aether-exports    - CSV/PDF exports
 *   aether-strategies - Strategy JSON backups
 *   aether-backups    - Database backups
 *
 * Config:
 *   S3_ENDPOINT (default http://127.0.0.1:9000)
 *   S3_REGION    (default us-east-1)
 *   S3_ACCESS_KEY (default aether-admin)
 *   S3_SECRET_KEY (required, from /etc/default/minio)
 *   S3_BUCKET    (override default bucket)
 */
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "../../lib/logger";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "http://127.0.0.1:9000";
const S3_REGION = process.env.S3_REGION || "us-east-1";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || "aether-admin";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || "";
const S3_FORCE_PATH_STYLE = true; // MinIO requires this

let s3: S3Client | null = null;
function getClient(): S3Client {
  if (!s3) {
    s3 = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: { accessKeyId: S3_ACCESS_KEY, secretAccessKey: S3_SECRET_KEY },
      forcePathStyle: S3_FORCE_PATH_STYLE,
    });
  }
  return s3;
}

export const BUCKETS = {
  kyc: "aether-kyc",
  exports: "aether-exports",
  strategies: "aether-strategies",
  backups: "aether-backups",
} as const;

export async function ensureBucket(name: string): Promise<boolean> {
  try {
    const client = getClient();
    await client.send(new HeadBucketCommand({ Bucket: name }));
    return true;
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound") {
      try {
        await getClient().send(new CreateBucketCommand({ Bucket: name }));
        logger.info({ bucket: name }, "s3 bucket created");
        return true;
      } catch (createErr) {
        logger.error({ err: (createErr as Error).message, bucket: name }, "s3 bucket create failed");
        return false;
      }
    }
    logger.warn({ err: err.message, bucket: name }, "s3 bucket check failed");
    return false;
  }
}

export async function uploadObject(bucket: string, key: string, body: Buffer | string, contentType?: string): Promise<{ etag: string; location: string } | null> {
  try {
    const client = getClient();
    const r = await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }));
    return { etag: r.ETag || "", location: `${S3_ENDPOINT}/${bucket}/${key}` };
  } catch (err) {
    logger.error({ err: (err as Error).message, bucket, key }, "s3 upload failed");
    return null;
  }
}

export async function getObject(bucket: string, key: string): Promise<Buffer | null> {
  try {
    const r = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks: Uint8Array[] = [];
    // @ts-ignore — Body is a stream in node
    for await (const chunk of r.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    logger.error({ err: (err as Error).message, bucket, key }, "s3 get failed");
    return null;
  }
}

export async function deleteObject(bucket: string, key: string): Promise<boolean> {
  try {
    await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    logger.error({ err: (err as Error).message, bucket, key }, "s3 delete failed");
    return false;
  }
}

export async function getSignedDownloadUrl(bucket: string, key: string, expiresIn = 3600): Promise<string | null> {
  try {
    return await getSignedUrl(getClient(), new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  } catch (err) {
    logger.error({ err: (err as Error).message, bucket, key }, "s3 presign failed");
    return null;
  }
}

export async function listObjects(bucket: string, prefix?: string, maxKeys = 1000): Promise<{ key: string; size: number; lastModified: Date }[]> {
  try {
    const r = await getClient().send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: maxKeys }));
    return (r.Contents || []).map(o => ({ key: o.Key || "", size: o.Size || 0, lastModified: o.LastModified || new Date() }));
  } catch (err) {
    logger.error({ err: (err as Error).message, bucket }, "s3 list failed");
    return [];
  }
}

export function isS3Configured(): boolean {
  return !!S3_SECRET_KEY;
}

export async function initS3(): Promise<void> {
  if (!isS3Configured()) {
    logger.warn("S3_SECRET_KEY not set — object storage disabled");
    return;
  }
  for (const bucket of Object.values(BUCKETS)) {
    await ensureBucket(bucket);
  }
  logger.info("s3 buckets ready");
}
