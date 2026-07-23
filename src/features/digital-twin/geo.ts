export type Position = [number, number];

export interface GeoFeature {
  type: "Feature";
  properties: {
    name?: string;
    fullname?: string;
    code?: string;
    center?: Position;
    [key: string]: unknown;
  };
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: Position[][] | Position[][][];
  };
}

export interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
  coordinateSystem?: "GCJ-02";
}

const boundaryTolerance = 1e-10;

function coordinateOnSegment(point: readonly [number, number], start: Position, end: Position) {
  const crossProduct = (point[0] - start[0]) * (end[1] - start[1])
    - (point[1] - start[1]) * (end[0] - start[0]);
  if (Math.abs(crossProduct) > boundaryTolerance) return false;
  return point[0] >= Math.min(start[0], end[0]) - boundaryTolerance
    && point[0] <= Math.max(start[0], end[0]) + boundaryTolerance
    && point[1] >= Math.min(start[1], end[1]) - boundaryTolerance
    && point[1] <= Math.max(start[1], end[1]) + boundaryTolerance;
}

function coordinateInRing(point: readonly [number, number], ring: Position[]) {
  let windingNumber = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const start = ring[index];
    const end = ring[(index + 1) % ring.length];
    if (!start || !end) continue;
    if (coordinateOnSegment(point, start, end)) return true;
    if (start[1] <= point[1]) {
      if (end[1] > point[1]) {
        const side = (end[0] - start[0]) * (point[1] - start[1])
          - (point[0] - start[0]) * (end[1] - start[1]);
        if (side > 0) windingNumber += 1;
      }
    } else if (end[1] <= point[1]) {
      const side = (end[0] - start[0]) * (point[1] - start[1])
        - (point[0] - start[0]) * (end[1] - start[1]);
      if (side < 0) windingNumber -= 1;
    }
  }
  return windingNumber !== 0;
}

function coordinateInPolygon(point: readonly [number, number], polygon: Position[][]) {
  const outerRing = polygon[0];
  return Boolean(
    outerRing
    && coordinateInRing(point, outerRing)
    && polygon.slice(1).every((hole) => !coordinateInRing(point, hole)),
  );
}

export function featureContainsCoordinate(
  feature: GeoFeature,
  coordinate: readonly [number, number],
) {
  const polygons = feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as Position[][]]
    : (feature.geometry.coordinates as Position[][][]);
  return polygons.some((polygon) => coordinateInPolygon(coordinate, polygon));
}
