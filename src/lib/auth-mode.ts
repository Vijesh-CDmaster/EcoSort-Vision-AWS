/**
 * Auth mode detection.
 *
 * When the Clerk publishable key is present, the app runs in "clerk" mode:
 * real authentication via Clerk, roles from user metadata, route protection
 * in middleware (which additionally requires CLERK_SECRET_KEY).
 * Without it, the app falls back to "demo" mode with the built-in demo
 * accounts so the project is fully usable out of the box.
 *
 * Only NEXT_PUBLIC_* variables are visible to the browser, so this check is
 * identical on both client and server — avoiding hydration mismatches.
 */

export const CLERK_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
);

export function isClerkConfigured(): boolean {
  return CLERK_CONFIGURED;
}
