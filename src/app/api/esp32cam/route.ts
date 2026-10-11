import { NextRequest, NextResponse } from "next/server";

// Proxy endpoint to fetch ESP32-CAM snapshots, bypassing CORS
// ESP32-CAM firmware typically provides /capture endpoint for still images
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' parameter" },
        { status: 400 }
      );
    }

    // Convert stream URL to capture URL if needed
    // ESP32-CAM typically has:
    // - /stream for MJPEG stream
    // - /capture or /jpg for single frame capture
    let captureUrl = url;
    if (url.includes("/stream")) {
      captureUrl = url.replace("/stream", "/capture");
    } else if (url.endsWith(":81")) {
      captureUrl = url + "/capture";
    } else if (!url.includes("/capture") && !url.includes("/jpg")) {
      // Try adding /capture if no endpoint specified
      captureUrl = url.replace(/\/?$/, "/capture");
    }

    // Fetch the image from ESP32-CAM
    const response = await fetch(captureUrl, {
      method: "GET",
      headers: {
        Accept: "image/jpeg, image/*",
      },
      // Short timeout since ESP32-CAM is local
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `ESP32-CAM returned status ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    
    // Check if it's an image
    if (!contentType.includes("image")) {
      return NextResponse.json(
        { error: "ESP32-CAM did not return an image" },
        { status: 502 }
      );
    }

    // Get the image as a buffer and convert to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      image: dataUrl,
      captureUrl,
    });
  } catch (error) {
    console.error("ESP32-CAM proxy error:", error);
    
    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        { error: "ESP32-CAM connection timeout - check if the device is online" },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch from ESP32-CAM" },
      { status: 500 }
    );
  }
}

// GET endpoint to check ESP32-CAM connectivity
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  
  if (!url) {
    return NextResponse.json(
      { error: "Missing 'url' query parameter" },
      { status: 400 }
    );
  }

  try {
    // Try to reach the ESP32-CAM
    let statusUrl = url;
    if (url.includes("/stream")) {
      statusUrl = url.replace("/stream", "/status");
    } else if (url.endsWith(":81")) {
      statusUrl = url + "/status";
    }

    const response = await fetch(statusUrl, {
      method: "GET",
      signal: AbortSignal.timeout(3000),
    });

    return NextResponse.json({
      online: response.ok,
      status: response.status,
    });
  } catch {
    return NextResponse.json({
      online: false,
      error: "Cannot reach ESP32-CAM",
    });
  }
}
