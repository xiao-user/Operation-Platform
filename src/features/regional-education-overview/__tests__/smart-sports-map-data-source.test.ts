import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeoFeature } from "../geo";
import type { MapState } from "../map-state";
import {
  clearSmartSportsMapCacheForTests,
  smartSportsMapDataSource,
} from "../smart-sports-map-data-source";
import type { EducationLocation } from "../types";

function squareFeature(code: string, name: string, level: string): GeoFeature {
  return {
    type: "Feature",
    properties: { adcode: Number(code), code, name, level },
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

afterEach(() => {
  clearSmartSportsMapCacheForTests();
  vi.unstubAllGlobals();
});

describe("smart sports administrative map data source", () => {
  it("starts with every Guangdong prefecture-level city and hides institutions", () => {
    const state = smartSportsMapDataSource.initialState;

    expect(state).toMatchObject({
      scope: "province",
      regionName: "广东省",
      code: "440000",
      terminal: false,
    });
    expect(state.geoData.features).toHaveLength(21);
    expect(state.geoData.features.map((feature) => feature.properties.name))
      .toContain("揭阳市");
    expect(state.energyTowerMetric).toBe("coverage-population");
    expect(state.energyTowerMetricSource).toBe("virtual-prototype");
    expect(state.energyTowerTotal).toBe(20_000_000);
    expect(Object.values(state.energyTowerValues ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    )).toBe(20_000_000);
    expect(smartSportsMapDataSource.filterLocations([], state)).toEqual([]);
    expect(smartSportsMapDataSource.institutionNetworkAvailable(state, [])).toBe(false);
  });

  it("loads only the selected branch and reuses the cached request", async () => {
    const district = squareFeature("440103", "荔湾区", "district");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ type: "FeatureCollection", features: [district] }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const city = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440100",
    )!;

    const first = await smartSportsMapDataSource.loadChildState(
      smartSportsMapDataSource.initialState,
      city,
    );
    const second = await smartSportsMapDataSource.loadChildState(
      smartSportsMapDataSource.initialState,
      city,
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://geo.datav.aliyun.com/areas_v3/bound/440100_full.json",
      { signal: expect.any(AbortSignal) },
    );
    expect(first).toMatchObject({ scope: "city", code: "440100", terminal: false });
    expect(first?.geoData.features[0]?.properties.code).toBe("440103");
    expect(first?.contextGeoData?.features).toHaveLength(21);
    expect(first?.projectionGeoData).toBe(smartSportsMapDataSource.initialState.geoData);
    expect(first?.projectionKey).toBe(smartSportsMapDataSource.initialState.geometryKey);
    expect(first?.contextInteractive).toBe(true);
    expect(first?.contextPresentation).toBe("peers");
    expect(first?.contextRegionCode).toBe("440100");
    expect(first?.energyTowerTotal).toBe(
      smartSportsMapDataSource.initialState.energyTowerValues?.["440100"],
    );
    expect(Object.values(first?.energyTowerValues ?? {}).reduce(
      (sum, value) => sum + value,
      0,
    )).toBe(first?.energyTowerTotal);
    expect(second?.geoData).toBe(first?.geoData);
  });

  it("cancels an obsolete branch request and never caches its failure", async () => {
    const city = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440100",
    )!;
    let requestSignal: AbortSignal | undefined;
    const fetchMock = vi.fn().mockImplementationOnce((_: string, init: RequestInit) => {
      requestSignal = init.signal as AbortSignal;
      return new Promise((_, reject) => {
        requestSignal?.addEventListener("abort", () => reject(
          requestSignal?.reason ?? new DOMException("aborted", "AbortError"),
        ), { once: true });
      });
    }).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: "FeatureCollection",
        features: [squareFeature("440103", "荔湾区", "district")],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const cancelled = smartSportsMapDataSource.loadChildState(
      smartSportsMapDataSource.initialState,
      city,
      { signal: controller.signal },
    );

    controller.abort(new DOMException("superseded", "AbortError"));
    await expect(cancelled).rejects.toMatchObject({ name: "AbortError" });
    expect(requestSignal?.aborted).toBe(true);

    const retried = await smartSportsMapDataSource.loadChildState(
      smartSportsMapDataSource.initialState,
      city,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(retried).toMatchObject({ code: "440100", terminal: false });
  });

  it("times out a boundary request instead of keeping the map busy indefinitely", async () => {
    vi.useFakeTimers();
    try {
      const city = smartSportsMapDataSource.initialState.geoData.features.find(
        (feature) => feature.properties.code === "440100",
      )!;
      vi.stubGlobal("fetch", vi.fn((_: string, init: RequestInit) => new Promise((_, reject) => {
        const signal = init.signal as AbortSignal;
        signal.addEventListener("abort", () => reject(
          new DOMException("timed out", "AbortError"),
        ), { once: true });
      })));
      const pending = smartSportsMapDataSource.loadChildState(
        smartSportsMapDataSource.initialState,
        city,
      );
      const assertion = expect(pending).rejects.toThrow("行政区地图加载超时");

      await vi.advanceTimersByTimeAsync(8_000);
      await assertion;
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops at district focus without requesting township boundaries", async () => {
    const district = squareFeature("445202", "榕城区", "district");
    const cityState: MapState = {
      scope: "city",
      regionName: "揭阳市",
      code: "445200",
      geometryKey: "445200-children",
      geoData: { type: "FeatureCollection", features: [district] },
      terminal: false,
      contextGeoData: smartSportsMapDataSource.initialState.geoData,
      projectionGeoData: smartSportsMapDataSource.initialState.geoData,
      contextInteractive: true,
      contextPresentation: "peers",
      contextRegionCode: "445200",
    };
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await smartSportsMapDataSource.loadChildState(cityState, district);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      scope: "district",
      code: "445202",
      terminal: true,
      focusFeatureCode: "445202",
      externalRegionCode: "445200",
    });
    expect(result?.geometryKey).toBe(cityState.geometryKey);
    expect(result?.geoData).toBe(cityState.geoData);
    expect(result?.externalGeoData).toBe(cityState.contextGeoData);
    expect(result?.contextGeoData).toBeUndefined();
  });

  it("switches to a peer city while retaining the full peer context projection", async () => {
    const firstDistrict = squareFeature("440103", "荔湾区", "district");
    const secondDistrict = squareFeature("440303", "罗湖区", "district");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "FeatureCollection", features: [firstDistrict] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ type: "FeatureCollection", features: [secondDistrict] }),
      });
    vi.stubGlobal("fetch", fetchMock);
    const guangzhou = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440100",
    )!;
    const shenzhen = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "440300",
    )!;
    const guangzhouState = await smartSportsMapDataSource.loadChildState(
      smartSportsMapDataSource.initialState,
      guangzhou,
    );
    const shenzhenState = await smartSportsMapDataSource.loadChildState(
      guangzhouState!,
      shenzhen,
    );

    expect(shenzhenState).toMatchObject({ scope: "city", code: "440300" });
    expect(shenzhenState?.contextGeoData).toBe(guangzhouState?.contextGeoData);
    expect(shenzhenState?.projectionGeoData).toBe(guangzhouState?.contextGeoData);
    expect(shenzhenState?.projectionKey).toBe(guangzhouState?.projectionKey);
    expect(shenzhenState?.contextPresentation).toBe("peers");
    expect(shenzhenState?.contextRegionCode).toBe("440300");
  });

  it("focuses direct-admin cities without requesting a nonexistent district file", async () => {
    const city = smartSportsMapDataSource.initialState.geoData.features.find(
      (feature) => feature.properties.code === "441900",
    )!;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await smartSportsMapDataSource.loadChildState(
      smartSportsMapDataSource.initialState,
      city,
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      scope: "city",
      code: "441900",
      terminal: true,
      focusFeatureCode: "441900",
    });
    expect(result?.geometryKey).toBe(smartSportsMapDataSource.initialState.geometryKey);
  });

  it("keeps school locations out of province and city scenes", () => {
    const location: EducationLocation = {
      id: "school-1",
      name: "测试学校",
      type: "primary",
      coordinate: [113, 23],
      coordinateSystem: "GCJ-02",
      source: "public-address-approximation",
    };
    const cityState: MapState = {
      scope: "city",
      regionName: "揭阳市",
      code: "445200",
      geometryKey: "445200-children",
      geoData: { type: "FeatureCollection", features: [] },
      terminal: false,
    };
    const districtBoundary = squareFeature("445202", "榕城区", "district");
    const districtState: MapState = {
      scope: "district",
      regionName: "榕城区",
      code: "445202",
      geometryKey: "445202-children",
      geoData: { type: "FeatureCollection", features: [districtBoundary] },
      terminal: true,
      focusFeatureCode: "445202",
      boundaryFeature: districtBoundary,
    };

    expect(smartSportsMapDataSource.filterLocations([location], cityState)).toEqual([]);
    expect(smartSportsMapDataSource.institutionNetworkAvailable(cityState, [location]))
      .toBe(false);
    expect(smartSportsMapDataSource.filterLocations([location], districtState))
      .toEqual([location]);
    expect(smartSportsMapDataSource.institutionNetworkAvailable(districtState, [location]))
      .toBe(true);
  });
});
