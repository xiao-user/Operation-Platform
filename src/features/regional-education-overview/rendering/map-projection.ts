import * as THREE from "three";
import type { GeoFeature, GeoFeatureCollection, Position } from "../geo";
import { featureContainsCoordinate } from "../geo";

export interface MapProjection {
  projectCoordinate: (coordinate: readonly [number, number]) => [number, number];
  projectPoint: (coordinate: readonly [number, number], z?: number) => THREE.Vector3;
  makeShape: (rings: Position[][]) => THREE.Shape | undefined;
}

export function polygonsOf(feature: GeoFeature): Position[][][] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates as Position[][]]
    : (feature.geometry.coordinates as Position[][][]);
}

export function createMapProjection(
  geoData: GeoFeatureCollection,
  width: number,
  height: number,
  padding: number,
): MapProjection {
  let minimumLongitude = Number.POSITIVE_INFINITY;
  let maximumLongitude = Number.NEGATIVE_INFINITY;
  let minimumLatitude = Number.POSITIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;

  for (const feature of geoData.features) {
    for (const polygon of polygonsOf(feature)) {
      for (const ring of polygon) {
        for (const coordinate of ring) {
          minimumLongitude = Math.min(minimumLongitude, coordinate[0]);
          maximumLongitude = Math.max(maximumLongitude, coordinate[0]);
          minimumLatitude = Math.min(minimumLatitude, coordinate[1]);
          maximumLatitude = Math.max(maximumLatitude, coordinate[1]);
        }
      }
    }
  }

  if (![minimumLongitude, maximumLongitude, minimumLatitude, maximumLatitude].every(Number.isFinite)) {
    throw new Error("Map projection requires at least one valid coordinate");
  }

  const longitudeSpan = Math.max(0.0001, maximumLongitude - minimumLongitude);
  const latitudeSpan = Math.max(0.0001, maximumLatitude - minimumLatitude);
  const scale = Math.min(
    (width - padding * 2) / longitudeSpan,
    (height - padding * 2) / latitudeSpan,
  );
  const offsetX = (width - longitudeSpan * scale) / 2;
  const offsetY = (height - latitudeSpan * scale) / 2;

  function projectCoordinate(coordinate: readonly [number, number]): [number, number] {
    return [
      offsetX + (coordinate[0] - minimumLongitude) * scale,
      offsetY + (maximumLatitude - coordinate[1]) * scale,
    ];
  }

  function projectPoint(coordinate: readonly [number, number], z = 0) {
    const [x, y] = projectCoordinate(coordinate);
    return new THREE.Vector3(x - width / 2, -(y - height / 2), z);
  }

  function makeShape(rings: Position[][]) {
    const outerRing = rings[0];
    const outerStart = outerRing?.[0];
    if (!outerRing || !outerStart) return undefined;
    const shape = new THREE.Shape();
    const [startX, startY] = projectCoordinate(outerStart);
    shape.moveTo(startX - width / 2, -(startY - height / 2));
    for (const coordinate of outerRing.slice(1)) {
      const [x, y] = projectCoordinate(coordinate);
      shape.lineTo(x - width / 2, -(y - height / 2));
    }

    for (const holeRing of rings.slice(1)) {
      const holeStart = holeRing[0];
      if (!holeStart) continue;
      const hole = new THREE.Path();
      const [holeX, holeY] = projectCoordinate(holeStart);
      hole.moveTo(holeX - width / 2, -(holeY - height / 2));
      for (const coordinate of holeRing.slice(1)) {
        const [x, y] = projectCoordinate(coordinate);
        hole.lineTo(x - width / 2, -(y - height / 2));
      }
      shape.holes.push(hole);
    }
    return shape;
  }

  return { projectCoordinate, projectPoint, makeShape };
}

function ringArea(ring: Position[]) {
  let area = 0;
  for (let index = 0; index < ring.length - 1; index += 1) {
    const current = ring[index];
    const next = ring[index + 1];
    if (current && next) area += current[0] * next[1] - next[0] * current[1];
  }
  return Math.abs(area / 2);
}

function ringCentroid(ring: Position[]): Position | undefined {
  let twiceArea = 0;
  let longitude = 0;
  let latitude = 0;
  for (let index = 0; index < ring.length; index += 1) {
    const current = ring[index];
    const next = ring[(index + 1) % ring.length];
    if (!current || !next) continue;
    const cross = current[0] * next[1] - next[0] * current[1];
    twiceArea += cross;
    longitude += (current[0] + next[0]) * cross;
    latitude += (current[1] + next[1]) * cross;
  }
  if (Math.abs(twiceArea) < Number.EPSILON) return undefined;
  return [longitude / (3 * twiceArea), latitude / (3 * twiceArea)];
}

function pointToSegmentDistanceSquared(point: Position, start: Position, end: Position) {
  const deltaX = end[0] - start[0];
  const deltaY = end[1] - start[1];
  const lengthSquared = deltaX * deltaX + deltaY * deltaY;
  if (lengthSquared === 0) {
    const pointX = point[0] - start[0];
    const pointY = point[1] - start[1];
    return pointX * pointX + pointY * pointY;
  }
  const ratio = THREE.MathUtils.clamp(
    ((point[0] - start[0]) * deltaX + (point[1] - start[1]) * deltaY) / lengthSquared,
    0,
    1,
  );
  const pointX = point[0] - (start[0] + ratio * deltaX);
  const pointY = point[1] - (start[1] + ratio * deltaY);
  return pointX * pointX + pointY * pointY;
}

function distanceToFeatureBoundarySquared(feature: GeoFeature, point: Position) {
  let minimum = Number.POSITIVE_INFINITY;
  for (const polygon of polygonsOf(feature)) {
    for (const ring of polygon) {
      for (let index = 0; index < ring.length; index += 1) {
        const start = ring[index];
        const end = ring[(index + 1) % ring.length];
        if (start && end) {
          minimum = Math.min(minimum, pointToSegmentDistanceSquared(point, start, end));
        }
      }
    }
  }
  return minimum;
}

function featureBounds(feature: GeoFeature) {
  let minimumLongitude = Number.POSITIVE_INFINITY;
  let maximumLongitude = Number.NEGATIVE_INFINITY;
  let minimumLatitude = Number.POSITIVE_INFINITY;
  let maximumLatitude = Number.NEGATIVE_INFINITY;
  for (const polygon of polygonsOf(feature)) {
    for (const ring of polygon) {
      for (const coordinate of ring) {
        minimumLongitude = Math.min(minimumLongitude, coordinate[0]);
        maximumLongitude = Math.max(maximumLongitude, coordinate[0]);
        minimumLatitude = Math.min(minimumLatitude, coordinate[1]);
        maximumLatitude = Math.max(maximumLatitude, coordinate[1]);
      }
    }
  }
  return { minimumLongitude, maximumLongitude, minimumLatitude, maximumLatitude };
}

function largestOuterRing(geoData: GeoFeatureCollection) {
  let candidate: Position[] | undefined;
  let largestArea = 0;
  for (const feature of geoData.features) {
    for (const polygon of polygonsOf(feature)) {
      const outerRing = polygon[0];
      if (!outerRing) continue;
      const area = ringArea(outerRing);
      if (area > largestArea) {
        largestArea = area;
        candidate = outerRing;
      }
    }
  }
  return candidate;
}

export function largestOuterRingOfFeature(feature: GeoFeature | undefined) {
  if (!feature) return undefined;
  return largestOuterRing({ type: "FeatureCollection", features: [feature] });
}

/**
 * Resolves the center of the visible geometry instead of the administrative
 * seat stored in `properties.center`. The returned point is always kept inside
 * the feature so camera pivots and overlays cannot drift into holes or the sea.
 */
export function featureVisualCenter(feature: GeoFeature): Position | undefined {
  const sourceCentroid = feature.properties.centroid;
  if (
    Array.isArray(sourceCentroid)
    && sourceCentroid.length === 2
    && sourceCentroid.every((value) => typeof value === "number" && Number.isFinite(value))
    && featureContainsCoordinate(feature, sourceCentroid as Position)
  ) {
    return sourceCentroid as Position;
  }

  const polygonCentroids = polygonsOf(feature)
    .flatMap((polygon) => {
      const outerRing = polygon[0];
      const centroid = outerRing ? ringCentroid(outerRing) : undefined;
      return outerRing && centroid ? [{ area: ringArea(outerRing), centroid }] : [];
    })
    .sort((left, right) => right.area - left.area);
  const totalArea = polygonCentroids.reduce((sum, item) => sum + item.area, 0);
  if (totalArea > 0) {
    const weightedCentroid: Position = [
      polygonCentroids.reduce(
        (sum, item) => sum + item.centroid[0] * item.area,
        0,
      ) / totalArea,
      polygonCentroids.reduce(
        (sum, item) => sum + item.centroid[1] * item.area,
        0,
      ) / totalArea,
    ];
    if (featureContainsCoordinate(feature, weightedCentroid)) return weightedCentroid;
  }

  for (const { centroid } of polygonCentroids) {
    if (featureContainsCoordinate(feature, centroid)) return centroid;
  }

  const bounds = featureBounds(feature);
  if (!Number.isFinite(bounds.minimumLongitude)) return undefined;
  const boundingBoxCenter: Position = [
    (bounds.minimumLongitude + bounds.maximumLongitude) / 2,
    (bounds.minimumLatitude + bounds.maximumLatitude) / 2,
  ];
  if (featureContainsCoordinate(feature, boundingBoxCenter)) return boundingBoxCenter;

  const gridSize = 12;
  let bestPoint: Position | undefined;
  let bestDistance = Number.NEGATIVE_INFINITY;
  for (let xIndex = 0; xIndex < gridSize; xIndex += 1) {
    for (let yIndex = 0; yIndex < gridSize; yIndex += 1) {
      const candidate: Position = [
        THREE.MathUtils.lerp(
          bounds.minimumLongitude,
          bounds.maximumLongitude,
          (xIndex + 0.5) / gridSize,
        ),
        THREE.MathUtils.lerp(
          bounds.minimumLatitude,
          bounds.maximumLatitude,
          (yIndex + 0.5) / gridSize,
        ),
      ];
      if (!featureContainsCoordinate(feature, candidate)) continue;
      const distance = distanceToFeatureBoundarySquared(feature, candidate);
      if (distance > bestDistance) {
        bestDistance = distance;
        bestPoint = candidate;
      }
    }
  }
  return bestPoint ?? polygonsOf(feature)[0]?.[0]?.[0];
}
