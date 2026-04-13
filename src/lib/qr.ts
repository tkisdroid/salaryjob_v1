import { SignJWT, jwtVerify, errors as joseErrors } from "jose";

/**
 * Phase 4 D-15 — QR checkout token (JWT HS256).
 *
 * A Business generates a short-lived JWT encoding `{jobId, businessId, nonce}`
 * and displays it as a QR code for the Worker to scan at shift end. The Worker's
 * check-out Server Action verifies the JWT and transitions the application to
 * `completed`, then computes earnings.
 *
 * Security properties:
 *   - Signed with HS256 using `APPLICATION_JWT_SECRET` (32-byte random hex, set in Phase 4-01).
 *   - Default TTL 10 minutes (overridable via `ttlSeconds`).
 *   - `jwtVerify` is called with `algorithms: ['HS256']`, which rejects the
 *     classic "alg: none" confusion attack and any RS256 downgrade.
 *   - Tampered signatures fail in the library with `JWSSignatureVerificationFailed`.
 */

export type CheckoutPayload = {
  jobId: string;
  businessId: string;
  nonce: string;
  iat: number;
  exp: number;
};

export interface SignCheckoutTokenInput {
  jobId: string;
  businessId: string;
  nonce: string;
  /** Token lifetime in seconds; defaults to 600 (10 minutes). */
  ttlSeconds?: number;
}

const DEFAULT_TTL_SECONDS = 10 * 60;

function getSecret(): Uint8Array {
  const secret = process.env.APPLICATION_JWT_SECRET;
  if (!secret) {
    throw new Error(
      "APPLICATION_JWT_SECRET environment variable is required (Phase 4 D-15)",
    );
  }
  // If the env var is a 64-char hex string (32 bytes random), decode it directly.
  // Otherwise treat it as a UTF-8 string (keeps tests and non-hex secrets working).
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    const buf = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      buf[i] = parseInt(secret.slice(i * 2, i * 2 + 2), 16);
    }
    return buf;
  }
  return new TextEncoder().encode(secret);
}

/**
 * Sign a checkout QR payload. Called by `generateCheckoutQrToken` Server Action
 * on the Business side.
 */
export async function signCheckoutToken(
  input: SignCheckoutTokenInput,
): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const ttl = input.ttlSeconds ?? DEFAULT_TTL_SECONDS;
  // Note: ttlSeconds may be negative in tests that want to mint an already-expired token.
  return await new SignJWT({
    jobId: input.jobId,
    businessId: input.businessId,
    nonce: input.nonce,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(nowSec)
    .setExpirationTime(nowSec + ttl)
    .sign(getSecret());
}

/**
 * Verify a checkout token scanned by the Worker. Throws on:
 *   - Invalid signature (tampered)
 *   - Expired (`exp < now`)
 *   - Wrong algorithm (anything other than HS256 — blocks `alg: none`)
 *   - Missing required fields
 *
 * Test bypass: when NODE_ENV=test AND VITEST=true AND token==='test-bypass',
 * skips JWT verification and returns a synthetic payload whose jobId/businessId
 * are read from the application row in the calling action. This allows
 * integration tests to call checkOut() without minting a real JWT.
 * Guarded by the same dual-env check used in dal.ts (VITEST is set automatically
 * by vitest; production never sets it).
 */
export async function verifyCheckoutToken(
  token: string,
): Promise<CheckoutPayload> {
  // Test-mode bypass — allows integration tests to call checkOut() without
  // signing a real JWT. Production paths never reach this branch.
  if (
    token === "test-bypass" &&
    process.env.NODE_ENV === "test" &&
    process.env.VITEST === "true"
  ) {
    const now = Math.floor(Date.now() / 1000);
    // Return a synthetic payload; the calling action validates jobId/businessId
    // against the DB — those checks still run even in test mode. The bypass
    // only skips the cryptographic signature step.
    return {
      jobId: "__test_bypass__",
      businessId: "__test_bypass__",
      nonce: "test",
      iat: now,
      exp: now + 600,
    };
  }

  const { payload } = await jwtVerify(token, getSecret(), {
    algorithms: ["HS256"],
  });

  if (
    typeof payload.jobId !== "string" ||
    typeof payload.businessId !== "string" ||
    typeof payload.nonce !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    throw new Error("Invalid checkout QR payload shape");
  }

  return {
    jobId: payload.jobId,
    businessId: payload.businessId,
    nonce: payload.nonce,
    iat: payload.iat,
    exp: payload.exp,
  };
}

export { joseErrors };
