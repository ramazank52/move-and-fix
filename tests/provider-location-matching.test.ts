import { describe, expect, it } from "vitest";

import {
  calculateHaversineDistanceKm,
  rankServiceOpportunitiesByLocation,
} from "../server/matching/location";

describe("provider location matching", () => {
  it("calculates a stable distance for valid coordinates", () => {
    const distance = calculateHaversineDistanceKm(41.0082, 28.9784, 41.0369, 28.985);
    expect(distance).not.toBeNull();
    expect(distance!).toBeGreaterThan(3);
    expect(distance!).toBeLessThan(4);
  });

  it("rejects invalid coordinate input instead of guessing", () => {
    expect(calculateHaversineDistanceKm("unknown", "29", "41", "29")).toBeNull();
    expect(calculateHaversineDistanceKm(91, 29, 41, 29)).toBeNull();
  });

  it("filters known out-of-radius jobs and ranks nearby jobs first", () => {
    const ranked = rankServiceOpportunitiesByLocation(
      [
        { id: 1, latitude: "41.01", longitude: "28.98", createdAt: new Date("2026-01-01") },
        { id: 2, latitude: "39.93", longitude: "32.85", createdAt: new Date("2026-01-03") },
        { id: 3, latitude: null, longitude: null, createdAt: new Date("2026-01-02") },
      ],
      "41.0082",
      "28.9784",
      50,
    );

    expect(ranked.map((request) => request.id)).toEqual([1, 3]);
    expect(ranked[0].matchDistanceKm).toBeLessThan(1);
    expect(ranked[1].matchDistanceKm).toBeNull();
  });

  it("preserves legacy opportunities when provider coordinates are unavailable", () => {
    const ranked = rankServiceOpportunitiesByLocation(
      [
        { id: 1, latitude: "41", longitude: "29", createdAt: new Date("2026-01-01") },
        { id: 2, latitude: null, longitude: null, createdAt: new Date("2026-01-02") },
      ],
      null,
      null,
    );

    expect(ranked.map((request) => request.id)).toEqual([2, 1]);
    expect(ranked.every((request) => request.matchDistanceKm === null)).toBe(true);
  });
});
