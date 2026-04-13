/**
 * Phase 3 generalized form state — evolves from Phase 2's AuthFormState pattern
 * (src/app/(auth)/types.ts). Used by all Server Actions that need to return
 * errors or success feedback to a <form> via useActionState.
 *
 * Two variants:
 *   - Plain ActionResult<T>: success with optional data, OR a single error.
 *   - FieldActionResult<T>: adds fieldErrors for per-field form validation.
 */

export type ActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { error: string }
  | null
  | undefined;

export type FieldActionResult<T = void> =
  | { success: true; data?: T; message?: string }
  | { error: string; fieldErrors?: Record<string, string> }
  | null
  | undefined;

// Specific states for Phase 3 Server Actions
export type ProfileFormState = FieldActionResult<{ id: string }>;
export type AvatarFormState = ActionResult<{ avatarUrl: string }>;

/**
 * JobFormState extends FieldActionResult with an optional redirectTo sentinel.
 * Used by createJob to signal the D-31 image gate: when businessRegImageUrl is
 * null, the action returns { error: 'verify_required', redirectTo: '/biz/verify' }
 * so the call-site UI can router.push(redirectTo) instead of just showing a toast.
 */
export type JobFormState =
  | FieldActionResult<{ id: string }>
  | { error: string; redirectTo: string };
