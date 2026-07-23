import type { GeoFeature, GeoFeatureCollection, Position } from "./geo";

export type GeographicCoordinateSystem = "WGS84" | "GCJ-02";

const pi = Math.PI;
const earthSemiMajorAxis = 6_378_245;
const earthEccentricitySquared = 0.006693421622965943;

function outsideMainlandChina([longitude, latitude]: readonly [number, number]) {
  return longitude < 72.004 || longitude > 137.8347
    || latitude < 0.8293 || latitude > 55.8271;
}

function latitudeOffset(longitude: number, latitude: number) {
  let result = -100 + 2 * longitude + 3 * latitude
    + 0.2 * latitude * latitude + 0.1 * longitude * latitude
    + 0.2 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * pi) + 20 * Math.sin(2 * longitude * pi)) * 2 / 3;
  result += (20 * Math.sin(latitude * pi) + 40 * Math.sin(latitude / 3 * pi)) * 2 / 3;
  result += (160 * Math.sin(latitude / 12 * pi) + 320 * Math.sin(latitude * pi / 30)) * 2 / 3;
  return result;
}

function longitudeOffset(longitude: number, latitude: number) {
  let result = 300 + longitude + 2 * latitude
    + 0.1 * longitude * longitude + 0.1 * longitude * latitude
    + 0.1 * Math.sqrt(Math.abs(longitude));
  result += (20 * Math.sin(6 * longitude * pi) + 20 * Math.sin(2 * longitude * pi)) * 2 / 3;
  result += (20 * Math.sin(longitude * pi) + 40 * Math.sin(longitude / 3 * pi)) * 2 / 3;
  result += (150 * Math.sin(longitude / 12 * pi) + 300 * Math.sin(longitude / 30 * pi)) * 2 / 3;
  return result;
}

/** Converts a WGS84 longitude/latitude pair to the GCJ-02 coordinate system used by DataV. */
export function wgs84ToGcj02(coordinate: readonly [number, number]): Position {
  if (outsideMainlandChina(coordinate)) return [coordinate[0], coordinate[1]];

  const [longitude, latitude] = coordinate;
  const latitudeRadians = latitude / 180 * pi;
  const sine = Math.sin(latitudeRadians);
  const magic = 1 - earthEccentricitySquared * sine * sine;
  const squareRootMagic = Math.sqrt(magic);
  const deltaLatitude = latitudeOffset(longitude - 105, latitude - 35) * 180
    / ((earthSemiMajorAxis * (1 - earthEccentricitySquared)) / (magic * squareRootMagic) * pi);
  const deltaLongitude = longitudeOffset(longitude - 105, latitude - 35) * 180
    / (earthSemiMajorAxis / squareRootMagic * Math.cos(latitudeRadians) * pi);

  return [longitude + deltaLongitude, latitude + deltaLatitude];
}

function transformFeature(feature: GeoFeature): GeoFeature {
  const geometry = feature.geometry.type === "Polygon"
    ? {
        ...feature.geometry,
        coordinates: (feature.geometry.coordinates as Position[][]).map((ring) => (
          ring.map(wgs84ToGcj02)
        )),
      }
    : {
        ...feature.geometry,
        coordinates: (feature.geometry.coordinates as Position[][][]).map((polygon) => (
          polygon.map((ring) => ring.map(wgs84ToGcj02))
        )),
      };
  const center = feature.properties.center;
  const centroid = feature.properties.centroid;

  return {
    ...feature,
    properties: {
      ...feature.properties,
      ...(Array.isArray(center) && center.length >= 2
        ? { center: wgs84ToGcj02([Number(center[0]), Number(center[1])]) }
        : {}),
      ...(Array.isArray(centroid) && centroid.length >= 2
        ? { centroid: wgs84ToGcj02([Number(centroid[0]), Number(centroid[1])]) }
        : {}),
    },
    geometry,
  };
}

/** Normalizes a complete legacy WGS84 boundary collection before it enters the map engine. */
export function wgs84CollectionToGcj02(collection: GeoFeatureCollection): GeoFeatureCollection {
  return {
    ...collection,
    coordinateSystem: "GCJ-02",
    features: collection.features.map(transformFeature),
  };
}
