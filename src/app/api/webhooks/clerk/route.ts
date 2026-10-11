import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { API_BASE } from "@/lib/api";

/**
 * Clerk webhook — syncs user profiles into the PostgreSQL backend (yolo-service).
 *
 * Configure in the Clerk Dashboard: Endpoints → Webhooks →
 * https://<your-app>/api/webhooks/clerk with events `user.created` and
 * `user.updated`. Signing secret: CLERK_WEBHOOK_SECRET in .env.local.
 *
 * Without a signing secret the route accepts requests as-is (dev mode).
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  let payload: any;

  try {
    if (secret) {
      const wh = new Webhook(secret);
      const raw = await req.text();
      const svixId = req.headers.get("svix-id");
      const svixTimestamp = req.headers.get("svix-timestamp");
      const svixSignature = req.headers.get("svix-signature");
      if (!svixId || !svixTimestamp || !svixSignature) {
        return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
      }
      payload = wh.verify(raw, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      }) as any;
    } else {
      payload = await req.json();
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const type = payload?.type;
  const data = payload?.data;
  if (!data?.id) {
    return NextResponse.json({ error: "Unsupported payload" }, { status: 400 });
  }

  const meta = data.public_metadata ?? {};
  const email =
    data.email_addresses?.[0]?.email_address ?? data.email_address ?? "";
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || email;

  const userPayload = {
    id: data.id,
    email,
    name,
    role: meta.role === "government" ? "government" : "marketplace",
    accountType:
      meta.accountType === "seller" || meta.accountType === "both"
        ? meta.accountType
        : "buyer",
    department: meta.department,
    employeeId: meta.employee_id,
    verified: true,
    avatar: data.image_url,
  };

  try {
    const res = await fetch(`${API_BASE}/db/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userPayload),
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Backend rejected user sync: HTTP ${res.status}` },
        { status: 502 }
      );
    }
    const stored = await res.json();
    return NextResponse.json({ received: type, user: stored });
  } catch {
    return NextResponse.json(
      { error: "Backend offline — could not sync user" },
      { status: 502 }
    );
  }
}
