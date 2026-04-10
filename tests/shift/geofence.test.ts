// RED BASELINE (Wave 0): until Plan 04-05 implements isWithinGeofence (PostGIS ST_DWithin).
// REQ: SHIFT-01 — 체크인 시 매장 좌표 200m 반경 내에 Worker 좌표가 있어야 한다.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  createTestBusiness,
  truncatePhase4Tables,
} from "../fixtures/phase4";
import { skipIfNoSupabase } from "../helpers/skip-if-no-supabase";
import { isWithinGeofence } from "@/lib/geofence";

describe.skipIf(skipIfNoSupabase())("SHIFT-01 geofence ST_DWithin", () => {
  beforeEach(async () => {
    await truncatePhase4Tables(prisma);
  });
  afterEach(async () => {
    await truncatePhase4Tables(prisma);
  });

  it("returns true when worker is within 200m of business", async () => {
    const { profile } = await createTestBusiness({
      lat: 37.4979,
      lng: 127.0276,
    });
    // ~180m north (1° lat ≈ 111km, so 0.0016 ≈ 178m)
    const result = await isWithinGeofence(profile.id, {
      lat: 37.4979 + 0.0016,
      lng: 127.0276,
    });
    expect(result).toBe(true);
  });

  it("returns false when worker is more than 200m from business", async () => {
    const { profile } = await createTestBusiness({
      lat: 37.4979,
      lng: 127.0276,
    });
    // ~250m north
    const result = await isWithinGeofence(profile.id, {
      lat: 37.4979 + 0.00225,
      lng: 127.0276,
    });
    expect(result).toBe(false);
  });
});
