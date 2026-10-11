import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { isClerkConfigured } from "@/lib/auth-mode";

// Routes that stay public even in Clerk mode: auth pages, Clerk's own
// sign-in/sign-up, health checks, and static assets.
const isPublicRoute = createRouteMatcher([
  "/auth(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api(.*)",
]);

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  // Without Clerk keys the app runs in demo mode — no route protection.
  if (!isClerkConfigured()) {
    return NextResponse.next();
  }

  return clerkMiddleware(async (auth, request) => {
    const session = await auth();
    if (!isPublicRoute(request) && !session.userId) {
      return session.redirectToSignIn({ returnBackUrl: request.url });
    }
  })(req, event);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
