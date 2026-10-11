
import { getUpcycleIdeas } from "@/ai/flows/upcycle-ideas-flow";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { item } = await req.json();

    if (!item || typeof item !== 'string') {
      return NextResponse.json({ error: "Invalid item provided." }, { status: 400 });
    }

    const ideas = await getUpcycleIdeas(item);

    return NextResponse.json(ideas);

  } catch (error: any) {
    console.error("Upcycle API Error:", error);
    const errorMessage = error.message || "An unexpected error occurred.";
    const status = error.status || 500;
    return NextResponse.json({ error: "Failed to generate upcycling ideas.", details: errorMessage }, { status });
  }
}
