import { NextResponse } from "next/server";
import { getS3Config, uploadWasteImage } from "@/lib/s3";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const config = getS3Config();
  if (!config.configured) {
    return NextResponse.json(
      { error: "S3 is not configured. Set AWS_REGION and S3_BUCKET_NAME." },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || !("image" in body) || typeof body.image !== "string") {
    return NextResponse.json({ error: "Missing 'image' base64 data URI." }, { status: 400 });
  }

  try {
    const upload = await uploadWasteImage(body.image);
    return NextResponse.json({ success: true, upload });
  } catch (error) {
    const message = error instanceof Error ? error.message : "S3 upload failed.";
    const status = message.startsWith("Image ") ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
