import { mkdir, writeFile } from "node:fs/promises";

const outputPath = new URL("../src/assets/maps/rongcheng-regional-context.json", import.meta.url);
const districtOutputPath = new URL("../src/assets/maps/rongcheng-district-boundary.json", import.meta.url);
const sourceUrl = "https://nominatim.openstreetmap.org/lookup";
const focusRegion = ["445202", "榕城区", 3283326];
const regions = [
  ["445203", "揭东区", 3283323],
  ["445281", "普宁市", 3283325],
  ["445103", "潮安区", 3244424],
  ["440513", "潮阳区", 3283304],
  ["440511", "金平区", 3283307],
];

const url = new URL(sourceUrl);
url.search = new URLSearchParams({
  format: "geojson",
  polygon_geojson: "1",
  osm_ids: [focusRegion, ...regions].map(([, , osmId]) => `R${osmId}`).join(","),
});
const response = await fetch(url, {
  headers: { "User-Agent": "Operation-Platform-Rongcheng-Prototype/1.0" },
});
if (!response.ok) {
  throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
}
const source = await response.json();
if (!source || typeof source !== "object" || !Array.isArray(source.features)) {
  throw new Error("Nominatim returned an invalid GeoJSON feature collection");
}
const sourceById = new Map(source.features.map((feature) => [
  Number(feature?.properties?.osm_id),
  feature,
]));
const features = regions.map(([code, name, osmId]) => {
  const sourceFeature = sourceById.get(osmId);
  const geometryType = sourceFeature?.geometry?.type;
  if (geometryType !== "Polygon" && geometryType !== "MultiPolygon") {
    throw new Error(`Missing supported geometry for OSM relation ${osmId} (${name})`);
  }
  return {
    type: "Feature",
    properties: {
      code,
      name,
      fullname: name,
      osmId,
      source: "OpenStreetMap / Nominatim",
      dataStatus: "public-prototype",
    },
    geometry: sourceFeature.geometry,
  };
});
const [districtCode, districtName, districtOsmId] = focusRegion;
const districtSourceFeature = sourceById.get(districtOsmId);
const districtGeometryType = districtSourceFeature?.geometry?.type;
if (districtGeometryType !== "Polygon" && districtGeometryType !== "MultiPolygon") {
  throw new Error(`Missing supported geometry for OSM relation ${districtOsmId} (${districtName})`);
}
const districtCollection = {
  type: "FeatureCollection",
  name: "榕城区公开区级边界",
  properties: {
    source: "OpenStreetMap / Nominatim",
    license: "ODbL-1.0",
    note: "仅作为区域空间上下文和区级边界动效，不作为权威行政区划数据。",
  },
  features: [{
    type: "Feature",
    properties: {
      code: districtCode,
      name: districtName,
      fullname: districtName,
      osmId: districtOsmId,
      source: "OpenStreetMap / Nominatim",
      dataStatus: "public-prototype",
    },
    geometry: districtSourceFeature.geometry,
  }],
};
const collection = {
  type: "FeatureCollection",
  name: "榕城区相邻区县公开边界",
  properties: {
    focusCode: "445202",
    focusName: "榕城区",
    source: "OpenStreetMap / Nominatim",
    license: "ODbL-1.0",
    note: "仅作为区域空间上下文，不作为权威行政区划数据。",
  },
  features,
};

await mkdir(new URL("../src/assets/maps/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
await writeFile(districtOutputPath, `${JSON.stringify(districtCollection, null, 2)}\n`, "utf8");
console.log(`Wrote ${features.length} context features to ${outputPath.pathname}`);
console.log(`Wrote district boundary to ${districtOutputPath.pathname}`);
