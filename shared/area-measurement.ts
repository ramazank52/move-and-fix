export type MeasurementPoint = {
  x: number;
  y: number;
};

export type AreaMeasurementUnit = "m2" | "cm2";

export type AreaMeasurementDraft = {
  method: "manual_rectangle" | "manual_polygon" | "ar_depth";
  unit: AreaMeasurementUnit;
  points?: MeasurementPoint[];
  width?: number;
  height?: number;
  confidence?: number;
};

export type AreaMeasurementResult = {
  squareMeters: number;
  source: AreaMeasurementDraft["method"];
  confidence: number | null;
};

const MAX_METERS = 100_000;

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function toMeters(value: number, unit: AreaMeasurementUnit): number {
  return unit === "m2" ? value : value / 10_000;
}

export function calculatePolygonArea(points: MeasurementPoint[], unit: AreaMeasurementUnit): number {
  if (points.length < 3 || points.length > 100) {
    throw new Error("MEASUREMENT_INVALID_POLYGON");
  }

  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (!isFiniteNonNegative(current.x) || !isFiniteNonNegative(current.y) || !isFiniteNonNegative(next.x) || !isFiniteNonNegative(next.y)) {
      throw new Error("MEASUREMENT_INVALID_POINT");
    }
    twiceArea += current.x * next.y - next.x * current.y;
  }

  const area = toMeters(Math.abs(twiceArea) / 2, unit);
  if (!Number.isFinite(area) || area <= 0 || area > MAX_METERS) {
    throw new Error("MEASUREMENT_OUT_OF_RANGE");
  }
  return area;
}

export function calculateAreaMeasurement(draft: AreaMeasurementDraft): AreaMeasurementResult {
  if (draft.method === "manual_rectangle") {
    if (!isFiniteNonNegative(draft.width ?? Number.NaN) || !isFiniteNonNegative(draft.height ?? Number.NaN)) {
      throw new Error("MEASUREMENT_INVALID_DIMENSIONS");
    }
    const squareMeters = toMeters((draft.width ?? 0) * (draft.height ?? 0), draft.unit);
    if (!Number.isFinite(squareMeters) || squareMeters <= 0 || squareMeters > MAX_METERS) {
      throw new Error("MEASUREMENT_OUT_OF_RANGE");
    }
    return { squareMeters, source: draft.method, confidence: null };
  }

  if (draft.method === "manual_polygon") {
    return { squareMeters: calculatePolygonArea(draft.points ?? [], draft.unit), source: draft.method, confidence: null };
  }

  if (!isFiniteNonNegative(draft.width ?? Number.NaN) || !isFiniteNonNegative(draft.height ?? Number.NaN)) {
    throw new Error("MEASUREMENT_INVALID_DIMENSIONS");
  }
  if (!Number.isFinite(draft.confidence) || (draft.confidence ?? 0) < 0.8 || (draft.confidence ?? 0) > 1) {
    throw new Error("MEASUREMENT_LOW_CONFIDENCE");
  }
  const squareMeters = toMeters((draft.width ?? 0) * (draft.height ?? 0), draft.unit);
  if (!Number.isFinite(squareMeters) || squareMeters <= 0 || squareMeters > MAX_METERS) {
    throw new Error("MEASUREMENT_OUT_OF_RANGE");
  }
  return { squareMeters, source: draft.method, confidence: draft.confidence ?? null };
}
