import guangdongCities from "@/assets/maps/guangdong-cities.json";
import type { GeoFeature, GeoFeatureCollection } from "./geo";
import type { AdministrativeRegionScope } from "@/types/user";

const mapEndpoint = "https://geo.datav.aliyun.com/areas_v3/bound";
const mapRequestTimeoutMs = 8_000;
const collectionCache = new Map<string, GeoFeatureCollection>();

export class AdministrativeBoundaryUnavailableError extends Error {
  constructor(code: string) {
    super(`行政区 ${code} 暂无下级边界数据`);
    this.name = "AdministrativeBoundaryUnavailableError";
  }
}

export function normalizeAdministrativeFeature(feature: GeoFeature): GeoFeature {
  const adcode = feature.properties.adcode ?? feature.properties.code;
  return {
    ...feature,
    properties: {
      ...feature.properties,
      code: String(adcode ?? ""),
      level: feature.properties.level ?? (String(adcode ?? "").length > 6 ? "township" : undefined),
      fullname: feature.properties.fullname ?? feature.properties.name,
      source: feature.properties.source ?? "DataV.GeoAtlas",
      dataStatus: feature.properties.dataStatus ?? "public-prototype",
    },
  };
}

export function administrativeScopeForFeature(
  feature: GeoFeature,
): AdministrativeRegionScope | "township" | undefined {
  const level = feature.properties.level;
  if (level === "province" || level === "city" || level === "district" || level === "township") {
    return level;
  }
  const code = String(feature.properties.code ?? feature.properties.adcode ?? "");
  if (!/^\d{6,9}$/.test(code)) return undefined;
  if (code.length > 6) return "township";
  if (code.endsWith("0000")) return "province";
  if (code.endsWith("00")) return "city";
  return "district";
}

export function normalizeAdministrativeCollection(value: unknown): GeoFeatureCollection {
  if (
    !value
    || typeof value !== "object"
    || (value as { type?: unknown }).type !== "FeatureCollection"
    || !Array.isArray((value as { features?: unknown }).features)
  ) {
    throw new Error("行政区地图数据格式无效");
  }
  const source = value as GeoFeatureCollection;
  return {
    ...source,
    coordinateSystem: "GCJ-02",
    features: source.features.map(normalizeAdministrativeFeature),
  };
}

const initialGuangdongChildren = normalizeAdministrativeCollection(guangdongCities);
collectionCache.set("440000", initialGuangdongChildren);

export async function loadAdministrativeChildren(
  code: string,
  externalSignal?: AbortSignal,
) {
  if (!/^\d{6,9}$/.test(code)) {
    throw new Error(`无效行政区代码：${code}`);
  }
  if (externalSignal?.aborted) {
    throw externalSignal.reason ?? new DOMException("行政区地图加载已取消", "AbortError");
  }
  const cached = collectionCache.get(code);
  if (cached) return cached;
  const requestController = new AbortController();
  let timedOut = false;
  const forwardAbort = () => requestController.abort(externalSignal?.reason);
  externalSignal?.addEventListener("abort", forwardAbort, { once: true });
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    requestController.abort();
  }, mapRequestTimeoutMs);
  try {
    const response = await fetch(`${mapEndpoint}/${code}_full.json`, {
      signal: requestController.signal,
    });
    if (response.status === 404) throw new AdministrativeBoundaryUnavailableError(code);
    if (!response.ok) throw new Error(`行政区地图加载失败：${response.status}`);
    const collection = normalizeAdministrativeCollection(await response.json());
    collectionCache.set(code, collection);
    return collection;
  } catch (error) {
    if (timedOut) throw new Error("行政区地图加载超时，请稍后重试");
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", forwardAbort);
  }
}

export async function findAdministrativeBoundary(
  code: string,
  parentCode: string | undefined,
  signal?: AbortSignal,
) {
  const siblings = await loadAdministrativeChildren(parentCode ?? "100000", signal);
  const boundary = siblings.features.find((feature) => feature.properties.code === code);
  if (!boundary) throw new Error(`未找到行政区 ${code} 的边界数据`);
  return boundary;
}

export function clearAdministrativeBoundaryCacheForTests() {
  collectionCache.clear();
  collectionCache.set("440000", initialGuangdongChildren);
}
