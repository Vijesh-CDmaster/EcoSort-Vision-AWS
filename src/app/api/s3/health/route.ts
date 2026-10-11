import { NextResponse } from "next/server";
import { getS3Config } from "@/lib/s3";

export const runtime = "nodejs";

export function GET() {
  const { configured, region, bucket } = getS3Config();
  return NextResponse.json({
    configured,
    regionConfigured: Boolean(region),
    bucketConfigured: Boolean(bucket),
    connectivity: "not_checked",
    message: configured
      ? "S3 configuration is present. Connectivity is checked only by an upload request."
      : "S3 configuration is missing. Set AWS_REGION and S3_BUCKET_NAME.",
  });
}
