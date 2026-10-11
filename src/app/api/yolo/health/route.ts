import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  const serviceUrl = process.env.YOLO_SERVICE_URL ?? "http://127.0.0.1:8000";
  const url = `${serviceUrl.replace(/\/$/, "")}/health`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const res = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json({ ok: false, details: data }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, details: err?.name === "AbortError" ? "timeout" : String(err) },
      { status: 502 }
    );
  }
}
