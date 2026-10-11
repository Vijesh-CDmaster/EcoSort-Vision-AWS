import { SignUp } from "@clerk/nextjs";
import { isClerkConfigured } from "@/lib/auth-mode";
import Link from "next/link";

export default function SignUpPage() {
  if (!isClerkConfigured()) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="max-w-md w-full text-center space-y-4">
          <h1 className="text-2xl font-bold">Clerk is not configured</h1>
          <p className="text-muted-foreground">
            Add <code className="bg-muted px-1.5 py-0.5 rounded text-sm">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> and{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">CLERK_SECRET_KEY</code> to{" "}
            <code className="bg-muted px-1.5 py-0.5 rounded text-sm">.env.local</code> to enable Clerk sign-up.
          </p>
          <Link href="/auth/login" className="text-primary hover:underline inline-block">
            Back to demo login →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <SignUp />
    </div>
  );
}
