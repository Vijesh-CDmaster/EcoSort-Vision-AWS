import {
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

type S3CommandClient = Pick<S3Client, "send">;

export type DecodedImage = {
  body: Buffer;
  contentType: string;
};

export type S3UploadResult = {
  bucket: string;
  key: string;
  contentType: string;
  size: number;
  uri: string;
};

export function getS3Config() {
  const region = process.env.AWS_REGION?.trim() || null;
  const bucket = process.env.S3_BUCKET_NAME?.trim() || null;
  return {
    region,
    bucket,
    configured: Boolean(region && bucket),
  };
}

export function decodeImageDataUri(image: string): DecodedImage {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([a-zA-Z0-9+/]+={0,2})$/.exec(image);
  if (!match) {
    throw new Error("Image must be a base64 data URI with JPEG, PNG, or WebP content.");
  }

  const [, contentType, encoded] = match;
  const body = Buffer.from(encoded, "base64");
  if (body.length === 0 || body.length > MAX_UPLOAD_BYTES) {
    throw new Error(`Image must be between 1 byte and ${MAX_UPLOAD_BYTES} bytes.`);
  }
  if (!hasExpectedSignature(body, contentType)) {
    throw new Error("Image content does not match its declared file type.");
  }

  return { body, contentType };
}

function hasExpectedSignature(body: Buffer, contentType: string): boolean {
  if (contentType === "image/png") {
    return body.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (contentType === "image/jpeg") {
    return body.subarray(0, 3).equals(Buffer.from([255, 216, 255]));
  }
  return body.subarray(0, 4).equals(Buffer.from("RIFF")) &&
    body.subarray(8, 12).equals(Buffer.from("WEBP"));
}

export function createS3Client(config: S3ClientConfig = {}): S3Client {
  return new S3Client({
    ...config,
    region: config.region ?? process.env.AWS_REGION,
  });
}

export async function uploadWasteImage(
  image: string,
  client: S3CommandClient = createS3Client()
): Promise<S3UploadResult> {
  const config = getS3Config();
  if (!config.configured || !config.bucket || !config.region) {
    throw new Error("S3 is not configured. Set AWS_REGION and S3_BUCKET_NAME.");
  }

  const decoded = decodeImageDataUri(image);
  const extension = decoded.contentType.slice("image/".length).replace("jpeg", "jpg");
  const key = `waste-classifications/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${extension}`;

  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: decoded.body,
      ContentType: decoded.contentType,
      ServerSideEncryption: "AES256",
    })
  );

  return {
    bucket: config.bucket,
    key,
    contentType: decoded.contentType,
    size: decoded.body.length,
    uri: `s3://${config.bucket}/${key}`,
  };
}
