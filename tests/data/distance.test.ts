import { describe, expect, it } from "vitest";
import { calculateDistanceMeters } from "@/lib/distance";

describe("calculateDistanceMeters", () => {
  it("returns zero for identical coordinates", () => {
    expect(
      calculateDistanceMeters(
        { lat: 37.5665, lng: 126.978 },
        { lat: 37.5665, lng: 126.978 },
      ),
    ).toBe(0);
  });

  it("calculates geodesic distance for one degree of latitude", () => {
    const distance = calculateDistanceMeters(
      { lat: 37, lng: 127 },
      { lat: 38, lng: 127 },
    );

    expect(distance).toBeGreaterThan(110_500);
    expect(distance).toBeLessThan(111_500);
  });

  it("is symmetric regardless of direction", () => {
    const a = { lat: 37.5636, lng: 126.9827 };
    const b = { lat: 37.5665, lng: 126.978 };

    expect(calculateDistanceMeters(a, b)).toBeCloseTo(
      calculateDistanceMeters(b, a),
      6,
    );
  });
});
