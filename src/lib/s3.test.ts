import { describe, expect, it } from "vitest";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import {
  MAX_UPLOAD_BYTES,
  decodeImageDataUri,
  uploadWasteImage,
} from "./s3";

const onePixelPng =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("uploadWasteImage", () => {
  it("uploads a validated image with a unique server-generated key", async () => {
    process.env.AWS_REGION = "us-east-1";
    process.env.S3_BUCKET_NAME = "test-bucket";
    let command: PutObjectCommand | undefined;
    const client = {
      send: async (value: PutObjectCommand) => {
        command = value;
        return {};
      },
    };

    const result = await uploadWasteImage(onePixelPng, client);

    expect(result.bucket).toBe("test-bucket");
    expect(result.contentType).toBe("image/png");
    expect(result.key).toMatch(/^waste-classifications\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]+\.png$/);
    expect(command?.input.Bucket).toBe("test-bucket");
    expect(command?.input.ContentType).toBe("image/png");
    expect(command?.input.ServerSideEncryption).toBe("AES256");
  });

  it("rejects unsupported content types and oversized payloads", () => {
    expect(() => decodeImageDataUri("data:text/plain;base64,SGVsbG8=")).toThrow(
      "JPEG, PNG, or WebP"
    );
    const oversized = `data:image/png;base64,${Buffer.alloc(MAX_UPLOAD_BYTES + 1).toString("base64")}`;
    expect(() => decodeImageDataUri(oversized)).toThrow("between 1 byte");
  });
});
