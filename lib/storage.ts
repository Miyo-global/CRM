import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { getFileKeyFromUrl as parseFileKeyFromUrl } from "@/lib/files/storage-url";

function getR2Config() {
  return {
    region: process.env.R2_REGION || "auto",
    bucketName: process.env.R2_BUCKET_NAME,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT,
  };
}

export function isStorageConfigured(): boolean {
  const config = getR2Config();
  return !!(config.bucketName && config.accessKeyId && config.secretAccessKey && config.endpoint);
}

function getS3Client() {
  const config = getR2Config();
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: config.accessKeyId && config.secretAccessKey ? {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    } : undefined,
  });
}

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export async function uploadFile(
  file: File | Buffer,
  folder: string = "uploads",
  fileName?: string,
  mimeTypeOverride?: string,
  orgId?: string
): Promise<UploadResult> {
  const config = getR2Config();

  if (!config.bucketName) {
    throw new Error("R2 bucket not configured");
  }

  const buffer = Buffer.isBuffer(file) ? file : Buffer.from(await file.arrayBuffer());
  const originalName = Buffer.isBuffer(file) ? fileName ?? "file" : file.name;
  const mimeType = mimeTypeOverride || (Buffer.isBuffer(file) ? "application/octet-stream" : file.type);

  const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, "-");
  if (orgId !== undefined && !/^[a-zA-Z0-9_-]+$/.test(orgId)) {
    throw new Error("Invalid organization identifier");
  }
  const orgPrefix = orgId ? `o/${orgId}/` : "";
  const key = `${orgPrefix}${folder}/${Date.now()}-${randomUUID()}-${sanitizedName}`;

  const s3Client = getS3Client();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.bucketName,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
  );

  const publicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${key}`
    : key;

  return {
    url: publicUrl,
    key,
    size: buffer.length,
    mimeType,
  };
}

export function getOrgIdFromKey(key: string): string | null {
  const match = /^o\/([^/]+)\//.exec(key);
  return match ? match[1] : null;
}

export async function getFileUrl(key: string, expiresIn: number = 3600): Promise<string> {
  const config = getR2Config();

  if (!config.bucketName) {
    throw new Error("R2 bucket not configured");
  }

  const command = new GetObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  });

  const s3Client = getS3Client();
  return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFile(key: string): Promise<void> {
  const config = getR2Config();

  if (!config.bucketName) {
    throw new Error("R2 bucket not configured");
  }

  const s3Client = getS3Client();
  await s3Client.send(
    new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );
}

export async function fileExists(key: string): Promise<boolean> {
  const config = getR2Config();

  if (!config.bucketName) {
    return false;
  }

  try {
    const s3Client = getS3Client();
    await s3Client.send(
      new HeadObjectCommand({
        Bucket: config.bucketName,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function getFileKeyFromUrl(url: string): string {
  return parseFileKeyFromUrl(url);
}
export function getFileNameFromKey(key: string): string {
  const parts = key.split("/");
  const last = parts[parts.length - 1] ?? "download";
  const match = last.match(/^\d+-(?:[0-9a-fA-F-]{36}-)?(.+)$/);
  return match ? match[1] : last;
}

export interface GetFileStreamResult {
  body: import("stream").Readable;
  contentType?: string;
  contentLength?: number;
}

export async function getFileStream(key: string): Promise<GetFileStreamResult> {
  const config = getR2Config();
  if (!config.bucketName) {
    throw new Error("R2 bucket not configured");
  }
  const s3Client = getS3Client();
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: config.bucketName,
      Key: key,
    })
  );
  if (!response.Body) {
    throw new Error("File not found or empty");
  }
  return {
    body: response.Body as import("stream").Readable,
    contentType: response.ContentType ?? "application/octet-stream",
    contentLength: response.ContentLength,
  };
}
