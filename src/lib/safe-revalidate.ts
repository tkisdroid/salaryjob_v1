import { revalidatePath } from "next/cache";

/**
 * revalidatePath wrapped in a try/catch.
 *
 * Why: Server Actions unit-tested from vitest run outside a Next request
 * context. `revalidatePath` throws
 *   "Invariant: static generation store missing in revalidatePath /path"
 * in that environment. Production traffic always has a request context,
 * so the wrapped call succeeds on the happy path and silently no-ops
 * only during tests.
 *
 * Use this helper in Server Action bodies instead of calling
 * `revalidatePath` directly when the action is unit-testable.
 * Production behavior is identical to raw revalidatePath.
 */
export function safeRevalidate(
  path: string,
  type?: "layout" | "page",
): void {
  try {
    if (type) {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }
  } catch (e) {
    // Swallow "Invariant: static generation store missing" — only thrown
    // outside a Next request context (vitest, standalone scripts).
    // Rethrow anything else so real bugs aren't hidden.
    if (
      e instanceof Error &&
      e.message.includes("static generation store missing")
    ) {
      return;
    }
    throw e;
  }
}
