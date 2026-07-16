import { mkdir, writeFile } from "node:fs/promises";

const outputPath = new URL("../src/assets/maps/rongcheng-townships.json", import.meta.url);
const sourceUrl = "https://nominatim.openstreetmap.org/lookup";
const regions = [
  ["445202001", "榕华街道", "street", 12278077],
  ["445202002", "新兴街道", "street", 12278078],
  ["445202006", "榕东街道", "street", 12278074],
  ["445202008", "东阳街道", "street", 12278075],
  ["445202009", "东升街道", "street", 12278076],
  ["445202010", "东兴街道", "street", 12278080],
  ["445202011", "仙桥街道", "street", 12278085],
  ["445202012", "梅云街道", "street", 12278086],
  ["445202013", "渔湖街道", "street", 12278073],
  ["445202017", "进贤门街道", "street", 19805917],
  ["445202102", "地都镇", "town", 12278084],
  ["445202103", "砲台镇", "town", 12278083],
  ["445202104", "登岗镇", "town", 12278082],
];

const url = new URL(sourceUrl);
url.search = new URLSearchParams({
  format: "geojson",
  polygon_geojson: "1",
  osm_ids: regions.map(([, , , osmId]) => `R${osmId}`).join(","),
});

const response = await fetch(url, {
  headers: {
    "User-Agent": "Operation-Platform-Rongcheng-Prototype/1.0",
  },
});
if (!response.ok) {
  throw new Error(`Nominatim request failed: ${response.status} ${response.statusText}`);
}

const source = await response.json();
if (
  !source
  || typeof source !== "object"
  || !Array.isArray(source.features)
) {
  throw new Error("Nominatim returned an invalid GeoJSON feature collection");
}
const sourceById = new Map(
  source.features.map((feature) => {
    const osmId = feature?.properties?.osm_id;
    const geometryType = feature?.geometry?.type;
    if (
      !Number.isFinite(Number(osmId))
      || (geometryType !== "Polygon" && geometryType !== "MultiPolygon")
    ) {
      throw new Error("Nominatim returned a feature without a supported polygon geometry");
    }
    return [Number(osmId), feature];
  }),
);
const features = regions.map(([code, name, regionType, osmId]) => {
  const sourceFeature = sourceById.get(osmId);
  if (!sourceFeature) throw new Error(`Missing OSM relation ${osmId} (${name})`);
  return {
    type: "Feature",
    properties: {
      code,
      name,
      fullname: name,
      regionType,
      osmId,
      source: "OpenStreetMap / Nominatim",
      dataStatus: code === "445202013" ? "legacy-before-2022-split" : "public-prototype",
    },
    geometry: sourceFeature.geometry,
  };
});

const collection = {
  type: "FeatureCollection",
  name: "榕城区公开镇街边界（13/16）",
  properties: {
    parentCode: "445202",
    parentName: "榕城区",
    source: "OpenStreetMap / Nominatim",
    license: "ODbL-1.0",
    coverage: "13/16",
    note: "溪南、凤美、京冈三街道暂无可用公开多边形；渔湖边界仍为2022年拆分前范围。",
  },
  features,
};

await mkdir(new URL("../src/assets/maps/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
console.log(`Wrote ${features.length} features to ${outputPath.pathname}`);
