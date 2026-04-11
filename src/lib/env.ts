const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const REQUIRED_RUNTIME_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
] as const;

export type RequiredRuntimeEnvKey = (typeof REQUIRED_RUNTIME_ENV_KEYS)[number];

export function getSupabaseUrl(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || null;
}

export function getSupabasePublishableKey(): string | null {
  return SUPABASE_PUBLISHABLE_KEY?.trim() || null;
}

export function hasSupabasePublicEnv(): boolean {
  return Boolean(getSupabaseUrl() && getSupabasePublishableKey());
}

export function hasDatabaseUrl(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

export function getMissingRuntimeEnvKeys(): RequiredRuntimeEnvKey[] {
  const missing: RequiredRuntimeEnvKey[] = [];

  if (!getSupabaseUrl()) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!getSupabasePublishableKey()) {
    missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (!hasDatabaseUrl()) {
    missing.push("DATABASE_URL");
  }

  return missing;
}

export function hasRequiredRuntimeEnv(): boolean {
  return getMissingRuntimeEnvKeys().length === 0;
}

export function getSupabasePublicEnv() {
  const url = getSupabaseUrl();
  const publishableKey = getSupabasePublishableKey();

  if (!url || !publishableKey) {
    return null;
  }

  return { url, publishableKey };
}

export function getMissingEnvErrorMessage() {
  return [
    "Missing required environment variables.",
    "Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "(or NEXT_PUBLIC_SUPABASE_ANON_KEY), SUPABASE_SERVICE_ROLE_KEY, and DATABASE_URL.",
    "See .env.example for the expected shape.",
  ].join(" ");
}
