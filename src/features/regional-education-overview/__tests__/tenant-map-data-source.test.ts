import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAdministrativeBoundaryCacheForTests,
  loadAdministrativeChildren,
} from "../administrative-boundary-service";
import {
  createTenantMapDataSource,
  rongchengEducationTenantId,
} from "../tenant-map-data-source";
import type { GeoFeature } from "../geo";
import type { TenantAdministrativeRegion } from "@/types/user";

function squareFeature(code: string, name: string, level: string): GeoFeature {
  return {
    type: "Feature",
    properties: { adcode: Number(code), code, name, fullname: name, level },
    geometry: {
      type: "Polygon",
      coordinates: [[
        [112, 22],
        [114, 22],
        [114, 24],
        [112, 24],
        [112, 22],
      ]],
    },
  };
}

const guangzhouRegion: TenantAdministrativeRegion = {
  code: "440100",
  name: "广州市",
  scope: "city",
  path: [
    { code: "440000", name: "广东省", scope: "province" },
    { code: "440100", name: "广州市", scope: "city" },
  ],
};

const rongchengRegion: TenantAdministrativeRegion = {
  code: "445202",
  name: "榕城区",
  scope: "district",
  path: [
    { code: "440000", name: "广东省", scope: "province" },
    { code: "445200", name: "揭阳市", scope: "city" },
    { code: "445202", name: "榕城区", scope: "district" },
  ],
};

beforeEach(() => clearAdministrativeBoundaryCacheForTests());
afterEach(() => vi.unstubAllGlobals());

describe("tenant administrative map data source", () => {
  it("bounds the public boundary cache while retaining the built-in Guangdong collection", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ type: "FeatureCollection", features: [] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const codes = Array.from({ length: 16 }, (_, index) => String(510100 + index * 100));

    for (const code of codes) await loadAdministrativeChildren(code);
    expect(fetchMock).toHaveBeenCalledTimes(16);
    await loadAdministrativeChildren(codes[0]!);
    expect(fetchMock).toHaveBeenCalledTimes(17);
    await loadAdministrativeChildren("440000");
    expect(fetchMock).toHaveBeenCalledTimes(17);
  });

  it("uses a configured city as the immutable navigation root", async () => {
    const district = squareFeature("440106", "天河区", "district");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [district] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const source = await createTenantMapDataSource({
      tenantId: "bureau-guangzhou",
      region: guangzhouRegion,
      mode: "smart-sports",
    });

    expect(source.initialState).toMatchObject({
      code: "440100",
      regionName: "广州市",
      scope: "city",
      terminal: false,
      navigationPath: [{ code: "440100", name: "广州市", scope: "city" }],
    });
    expect(source.initialState.contextGeoData).toBeUndefined();
    expect(source.initialState.externalGeoData).toBeUndefined();
    expect(source.initialState.geoData.features[0]?.properties.code).toBe("440106");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const districtState = await source.loadChildState(source.initialState, district);
    expect(districtState).toMatchObject({
      code: "440106",
      scope: "district",
      terminal: true,
      navigationPath: [
        { code: "440100", name: "广州市", scope: "city" },
        { code: "440106", name: "天河区", scope: "district" },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces initial child-boundary failures instead of treating the root as terminal", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));

    await expect(createTenantMapDataSource({
      tenantId: "bureau-guangzhou",
      region: guangzhouRegion,
      mode: "regional-education",
    })).rejects.toThrow("行政区地图加载失败：500");
  });

  it("keeps a configured district terminal when no lower boundary is available", async () => {
    const district = squareFeature("440106", "天河区", "district");
    vi.stubGlobal("fetch", vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/440100_full.json")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ type: "FeatureCollection", features: [district] }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }));
    const districtRegion: TenantAdministrativeRegion = {
      code: "440106",
      name: "天河区",
      scope: "district",
      path: [...guangzhouRegion.path, { code: "440106", name: "天河区", scope: "district" }],
    };

    const source = await createTenantMapDataSource({
      tenantId: "bureau-tianhe",
      region: districtRegion,
      mode: "regional-education",
    });

    expect(source.initialState).toMatchObject({
      code: "440106",
      scope: "district",
      terminal: true,
      focusFeatureCode: "440106",
      navigationPath: [{ code: "440106", name: "天河区", scope: "district" }],
    });
    expect(source.initialState.geoData.features).toHaveLength(1);
  });

  it("injects the current 16-township boundary only for the configured Rongcheng tenant", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const source = await createTenantMapDataSource({
      tenantId: rongchengEducationTenantId,
      region: rongchengRegion,
      mode: "regional-education",
    });

    expect(source.initialState).toMatchObject({
      code: "445202",
      scope: "district",
      terminal: false,
      boundaryDataNotice: "16/16 现行街镇边界 · 数据截止 2025-06-30",
      navigationPath: [{ code: "445202", name: "榕城区", scope: "district" }],
    });
    expect(source.initialState.geoData.features).toHaveLength(16);
    expect(source.initialState.geoData.coordinateSystem).toBe("GCJ-02");
    expect(source.initialState.geoData.features.map((feature) => feature.properties.code))
      .toEqual(expect.arrayContaining(["445202014", "445202015", "445202016"]));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reuses the same 16-township boundary in the Rongcheng smart-sports cockpit", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const source = await createTenantMapDataSource({
      tenantId: rongchengEducationTenantId,
      region: rongchengRegion,
      mode: "smart-sports",
    });

    expect(source.initialState).toMatchObject({
      code: "445202",
      scope: "district",
      terminal: false,
      energyTowerMetric: "coverage-population",
      energyTowerTotal: 500_000,
      navigationPath: [{ code: "445202", name: "榕城区", scope: "district" }],
    });
    expect(source.initialState.geoData.coordinateSystem).toBe("GCJ-02");
    expect(source.initialState.geoData.features).toHaveLength(16);
    expect(Object.keys(source.initialState.energyTowerValues ?? {})).toHaveLength(16);
    expect(source.institutionNetworkAvailable(source.initialState, [{
      id: "school-1",
      name: "测试学校",
      type: "primary",
      coordinate: [116.4, 23.5],
      coordinateSystem: "GCJ-02",
      source: "public-address-approximation",
    }])).toBe(true);

    const township = source.initialState.geoData.features[0]!;
    const townshipState = await source.loadChildState(source.initialState, township);
    expect(townshipState).toMatchObject({
      scope: "township",
      terminal: true,
      boundaryDataNotice: "16/16 现行街镇边界 · 数据截止 2025-06-30",
      focusFeatureCode: township.properties.code,
      navigationPath: [
        { code: "445202", name: "榕城区", scope: "district" },
        {
          code: township.properties.code,
          name: township.properties.name,
          scope: "township",
        },
      ],
    });
    expect(townshipState?.energyTowerMetric).toBe("coverage-population");
    expect(source.institutionNetworkAvailable(townshipState!, [{
      id: "school-1",
      name: "测试学校",
      type: "primary",
      coordinate: [116.4, 23.5],
      coordinateSystem: "GCJ-02",
      source: "public-address-approximation",
    }])).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
