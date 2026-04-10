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
 */
export async function verifyCheckoutToken(
  token: string,
): Promise<CheckoutPayload> {
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
