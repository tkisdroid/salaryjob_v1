import { describe, it } from "vitest";

describe.skip("Phase 3 — PostGIS distance queries (D-06)", () => {
  describe("jobs.location GIST index", () => {
    it.todo("pg_indexes has a row with indexname='jobs_location_gist_idx'");
  });

  describe("getJobsByDistance", () => {
    it.todo("returns jobs within radiusM sorted by distance_m ASC");
    it.todo("excludes jobs outside radiusM");
    it.todo("each returned job has numeric distance_m property");
    it.todo("ST_MakePoint argument order: lng first, lat second (reversed returns nothing)");
  });
});
