import { mkdir, writeFile } from "node:fs/promises";

const outputPath = new URL("../src/assets/maps/guangdong-cities.json", import.meta.url);
const sourceUrl = "https://geo.datav.aliyun.com/areas_v3/bound/440000_full.json";

const response = await fetch(sourceUrl, {
  headers: { "User-Agent": "Operation-Platform-Smart-Sports-Prototype/1.0" },
});
if (!response.ok) {
  throw new Error(`Guangdong map request failed: ${response.status} ${response.statusText}`);
}

const source = await response.json();
if (!source || source.type !== "FeatureCollection" || !Array.isArray(source.features)) {
  throw new Error("Guangdong map source returned an invalid GeoJSON feature collection");
}

const collection = {
  type: "FeatureCollection",
  name: "广东省地级行政区公开边界",
  properties: {
    parentCode: "440000",
    parentName: "广东省",
    source: "DataV.GeoAtlas",
    dataStatus: "public-prototype",
    note: "智慧体育数字孪生原型首屏数据；市、区县和镇街通过 adcode 按需加载。",
  },
  features: source.features.map((feature) => ({
    type: "Feature",
    properties: {
      ...feature.properties,
      code: String(feature.properties?.adcode ?? ""),
      fullname: feature.properties?.name ?? "未命名行政区",
      source: "DataV.GeoAtlas",
      dataStatus: "public-prototype",
    },
    geometry: feature.geometry,
  })),
};

await mkdir(new URL("../src/assets/maps/", import.meta.url), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(collection)}\n`, "utf8");
console.log(`Wrote ${collection.features.length} Guangdong city boundaries to ${outputPath.pathname}`);
