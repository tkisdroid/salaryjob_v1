// Phase 2 Plan 02-08 — shared auth Server Action state type.
// Used by useActionState consumers in login/signup/role-select pages.
//
// All optional fields so a single shape narrows correctly whether the error
// came from Zod fieldErrors (email/password) or from Supabase (form).

export type AuthFormState =
  | {
      error?: {
        form?: string[]
        email?: string[]
        password?: string[]
        confirmPassword?: string[]
        name?: string[]
        businessName?: string[]
        businessCategory?: string[]
        businessAddress?: string[]
        businessRegNumber?: string[]
      }
      success?: boolean
    }
  | null
  | undefined
