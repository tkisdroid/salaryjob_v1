import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";

/**
 * Phase 4 SHIFT-01 D-09, D-10 — Geofence check using PostGIS ST_DWithin.
 *
 * Computes the geodesic distance between the worker's current GPS reading and
 * the business's stored `geography(Point, 4326)` column. The default radius of
 * 200m (D-10) accounts for typical urban GPS error (20–50m) plus building scale.
 *
 * Behavior:
 *   - Business not found → returns false (safe default).
 *   - Business has no location Point (legacy row) → returns true as a graceful
 *     fallback (logs a warning). This is acceptable because check-in also
 *     requires `status === 'confirmed'` and the time window, so geofence is
 *     one of three gates, not the only one.
 *   - Otherwise returns `ST_DWithin(location, worker_point, radiusM)`.
 *
 * @param businessId BusinessProfile.id (UUID)
 * @param coords     `{ lat, lng }` worker's current coordinates
 * @param radiusM    Allowed radius in meters (default 200)
 */
export async function isWithinGeofence(
  businessId: string,
  coords: { lat: number; lng: number },
  radiusM: number = 200,
): Promise<boolean> {
  const rows = await prisma.$queryRaw<
    { within: boolean; has_location: boolean }[]
  >(Prisma.sql`
    SELECT
      CASE
        WHEN location IS NULL THEN true
        ELSE ST_DWithin(
          location,
          ST_SetSRID(ST_MakePoint(${coords.lng}, ${coords.lat}), 4326)::geography,
          ${radiusM}
        )
      END AS within,
      (location IS NOT NULL) AS has_location
    FROM public.business_profiles
    WHERE id = ${businessId}::uuid
  `);

  if (rows.length === 0) {
    return false; // business not found — fail closed
  }
  const row = rows[0];
  if (!row.has_location) {
    console.warn(
      `[geofence] business ${businessId} has no location Point — falling back to true`,
    );
  }
  return row.within;
}
