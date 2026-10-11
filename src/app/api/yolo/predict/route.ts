import { NextResponse } from "next/server";
import { validateWasteImageSafety } from "@/ai/flows/validate-waste-image-safety-flow";

export const runtime = "nodejs";

type PredictRequest = {
  image: string;
  conf?: number;
  skipSafetyCheck?: boolean;
};

export async function POST(req: Request) {
  let body: PredictRequest;
  try {
    body = (await req.json()) as PredictRequest;
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }
  if (!body?.image || typeof body.image !== "string") {
    return NextResponse.json({ error: "Missing 'image'" }, { status: 400 });
  }

  if (!body.skipSafetyCheck) {
    try {
      const safetyResult = await validateWasteImageSafety(body.image);

      if (!safetyResult.safeForWasteClassification || safetyResult.hasHuman) {
        return NextResponse.json(
          {
            error: "Image blocked by safety check",
            details: safetyResult.reason || "Only the waste object should be visible. Remove people from the frame and try again.",
          },
          { status: 422 }
        );
      }
    } catch (error) {
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Safety check failed",
          details: "Gemini could not validate the image for human content.",
        },
        { status: 503 }
      );
    }
  }

  const serviceUrl = process.env.YOLO_SERVICE_URL ?? "http://127.0.0.1:8000";
  const url = `${serviceUrl.replace(/\/$/, "")}/predict`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);

    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { error: "YOLO service error", details: data ?? null },
        { status: 502 }
      );
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === "AbortError";
    return NextResponse.json(
      {
        error: "Failed to reach YOLO service",
        details: isAbort ? "timeout" : String(err),
        hint:
          "Start the python service: cd yolo-service; python -m uvicorn app:app --reload --port 8000",
      },
      { status: 502 }
    );
  }
}
