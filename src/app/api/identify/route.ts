import { NextRequest, NextResponse } from "next/server";
import { identifyWasteFromImage } from "@/ai/flows/identify-waste-flow";
import { validateWasteImageSafety } from "@/ai/flows/validate-waste-image-safety-flow";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image } = body;

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'image' parameter. Expected base64 image data." },
        { status: 400 }
      );
    }

    const safetyResult = await validateWasteImageSafety(image);

    if (!safetyResult.safeForWasteClassification || safetyResult.hasHuman) {
      return NextResponse.json(
        {
          error: "Image blocked by safety check",
          details: safetyResult.reason || "Only the waste object should be visible. Remove people from the frame and try again.",
        },
        { status: 422 }
      );
    }

    const result = await identifyWasteFromImage(image);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Waste identification API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to identify waste" },
      { status: 500 }
    );
  }
}
