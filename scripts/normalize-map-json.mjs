import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const target = resolve(process.argv[2] ?? "src/assets/maps/rongcheng-townships.json");
const parsed = JSON.parse(await readFile(target, "utf8"));
if (parsed?.type !== "FeatureCollection" || !Array.isArray(parsed.features)) {
  throw new Error(`${target} is not a GeoJSON FeatureCollection`);
}
if (parsed.properties && typeof parsed.properties === "object") {
  delete parsed.properties.generatedAt;
}
await writeFile(target, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
console.log(`Normalized ${parsed.features.length} features in ${target}`);
