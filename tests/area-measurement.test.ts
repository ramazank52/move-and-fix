import { describe, expect, it } from "vitest";
import { calculateAreaMeasurement, calculatePolygonArea } from "../shared/area-measurement";

describe("area measurement geometry", () => {
  it("calculates a manual rectangle in square meters", () => {
    expect(calculateAreaMeasurement({ method: "manual_rectangle", width: 4, height: 2.5, unit: "m2" })).toEqual({
      squareMeters: 10,
      source: "manual_rectangle",
      confidence: null,
    });
  });

  it("accepts canonical linear m/cm units while preserving legacy square-unit aliases", () => {
    expect(calculateAreaMeasurement({ method: "manual_rectangle", width: 4, height: 2.5, unit: "m" }).squareMeters).toBe(10);
    expect(calculateAreaMeasurement({ method: "manual_rectangle", width: 400, height: 250, unit: "cm" }).squareMeters).toBe(10);
  });

  it("calculates a polygon with the shoelace formula", () => {
    expect(calculatePolygonArea([{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 3 }, { x: 0, y: 3 }], "m2")).toBe(12);
  });

  it("rejects invalid geometry and unverified AR confidence", () => {
    expect(() => calculateAreaMeasurement({ method: "manual_polygon", unit: "m2", points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] })).toThrow("MEASUREMENT_INVALID_POLYGON");
    expect(() => calculateAreaMeasurement({ method: "ar_depth", unit: "m2", width: 2, height: 3, confidence: 0.5 })).toThrow("MEASUREMENT_LOW_CONFIDENCE");
  });

  it("keeps AR plane input behind the same confidence and bounds validation", () => {
    expect(calculateAreaMeasurement({ method: "ar_plane", unit: "m", width: 2, height: 3, confidence: 0.9 })).toMatchObject({
      squareMeters: 6,
      source: "ar_plane",
      confidence: 0.9,
    });
    expect(() => calculateAreaMeasurement({ method: "ar_plane", unit: "m", width: 2, height: 3, confidence: 0.79 })).toThrow("MEASUREMENT_LOW_CONFIDENCE");
  });
});
