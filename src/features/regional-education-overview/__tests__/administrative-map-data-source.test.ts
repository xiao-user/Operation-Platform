import { describe, expect, it, vi } from "vitest";
import type { GeoFeature, GeoFeatureCollection } from "../geo";
import {
  createAdministrativeBoundaryProviderChain,
  createAdministrativeMapDataSource,
  createStaticAdministrativeBoundaryProvider,
} from "../administrative-map-data-source";
import type { AdministrativeBoundaryProvider } from "../administrative-map-data-source";
import type { MapState } from "../map-state";

function squareFeature(
  code: string,
  name: string,
  level: "province" | "city" | "district" | "township",
  childrenNum?: number,
): GeoFeature {
  return {
    type: "Feature",
    properties: { code, name, level, childrenNum },
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

function collection(...features: GeoFeature[]): GeoFeatureCollection {
  return { type: "FeatureCollection", features };
}

function sourceFor(initialState: MapState, provider: AdministrativeBoundaryProvider) {
  return createAdministrativeMapDataSource({
    initialState,
    provider,
    minimumLocationScope: "district",
    institutionNetworkScopes: ["district"],
  });
}

describe("generic administrative map data source", () => {
  it("infers a missing district level from a valid six-digit administrative code", async () => {
    const district = squareFeature("440103", "甲区", "district");
    delete district.properties.level;
    const resolveChildren = vi.fn(async () => ({ status: "unavailable" as const }));
    const source = sourceFor({
      scope: "city",
      regionName: "甲市",
      code: "440100",
      geometryKey: "city-districts",
      geoData: collection(district),
      terminal: false,
    }, { resolveChildren });

    const state = await source.loadChildState(source.initialState, district);

    expect(resolveChildren).toHaveBeenCalledWith(
      expect.objectContaining({ code: "440103", scope: "district" }),
      undefined,
    );
    expect(state).toMatchObject({ code: "440103", scope: "district", terminal: true });
  });

  it("derives active, peer and outer bands without hard-coded province/city branches", async () => {
    const cityA = squareFeature("440100", "甲市", "city");
    const cityB = squareFeature("440200", "乙市", "city", 0);
    const districtA = squareFeature("440103", "甲区", "district", 0);
    const neighbouringProvince = squareFeature("450000", "邻省", "province");
    const cities = collection(cityA, cityB);
    const outer = collection(neighbouringProvince);
    const provider = createAdministrativeBoundaryProviderChain([
      createStaticAdministrativeBoundaryProvider(new Map([["440100", collection(districtA)]])),
      { resolveChildren: vi.fn(async () => ({ status: "unsupported" as const })) },
    ]);
    const source = sourceFor({
      scope: "province",
      regionName: "测试省",
      code: "440000",
      geometryKey: "province-cities",
      geoData: cities,
      terminal: false,
      externalGeoData: outer,
      externalGeometryKey: "neighbouring-provinces",
      navigationPath: [{ code: "440000", name: "测试省", scope: "province" }],
    }, provider);

    const cityState = await source.loadChildState(source.initialState, cityA);
    expect(cityState).toMatchObject({
      scope: "city",
      code: "440100",
      terminal: false,
      contextPresentation: "peers",
      contextRegionCode: "440100",
    });
    expect(cityState?.geoData).toEqual(collection(districtA));
    expect(cityState?.contextGeoData).toBe(cities);
    expect(cityState?.externalGeoData).toBe(outer);

    const districtState = await source.loadChildState(cityState!, districtA);
    expect(districtState).toMatchObject({
      scope: "district",
      code: "440103",
      terminal: true,
      focusFeatureCode: "440103",
      externalRegionCode: "440100",
      navigationPath: [
        { code: "440000" },
        { code: "440100" },
        { code: "440103" },
      ],
    });
    expect(districtState?.geoData).toBe(cityState?.geoData);
    expect(districtState?.externalGeoData).toBe(cities);
    expect(districtState?.externalInteractive).toBe(true);

    const peerState = await source.loadChildState(cityState!, cityB);
    expect(peerState).toMatchObject({
      scope: "city",
      code: "440200",
      terminal: true,
      navigationPath: [{ code: "440000" }, { code: "440200" }],
    });
    expect(peerState?.geoData).toBe(cities);
    expect(peerState?.externalGeoData).toBe(outer);
  });

  it("keeps outer geometry visible while disabling it outside configured scopes", async () => {
    const township = squareFeature("445202001", "甲街道", "township", 0);
    const neighbouringDistrict = squareFeature("445203", "乙区", "district", 0);
    const outer = collection(neighbouringDistrict);
    const source = createAdministrativeMapDataSource({
      initialState: {
        scope: "district",
        regionName: "榕城区",
        code: "445202",
        geometryKey: "district-townships",
        geoData: collection(township),
        terminal: false,
        externalGeoData: outer,
        externalGeometryKey: "neighbouring-districts",
      },
      provider: { resolveChildren: vi.fn(async () => ({ status: "unavailable" as const })) },
      externalInteractionScopes: [],
    });

    const state = await source.loadChildState(source.initialState, township);

    expect(state?.externalGeoData).toBe(outer);
    expect(state?.externalInteractive).toBe(false);
  });

  it("lets a higher-priority local provider extend a branch marked leaf by public metadata", async () => {
    const township = squareFeature("445202001", "甲街道", "township", 0);
    const district = squareFeature("445202", "榕城区", "district", 0);
    const local = createStaticAdministrativeBoundaryProvider(
      new Map([["445202", collection(township)]]),
    );
    const publicProvider = {
      resolveChildren: vi.fn(async () => ({ status: "unavailable" as const })),
    };
    const source = sourceFor({
      scope: "city",
      regionName: "揭阳市",
      code: "445200",
      geometryKey: "jieyang-districts",
      geoData: collection(district),
      terminal: false,
    }, createAdministrativeBoundaryProviderChain([local, publicProvider]));

    const state = await source.loadChildState(source.initialState, district);

    expect(state).toMatchObject({ scope: "district", code: "445202", terminal: false });
    expect(state?.geoData).toEqual(collection(township));
    expect(publicProvider.resolveChildren).not.toHaveBeenCalled();
  });

  it("propagates provider failures instead of silently converting them into terminal branches", async () => {
    const city = squareFeature("440100", "甲市", "city");
    const source = sourceFor({
      scope: "province",
      regionName: "测试省",
      code: "440000",
      geometryKey: "province-cities",
      geoData: collection(city),
      terminal: false,
    }, {
      resolveChildren: vi.fn(async () => {
        throw new Error("boundary service unavailable");
      }),
    });

    await expect(source.loadChildState(source.initialState, city))
      .rejects.toThrow("boundary service unavailable");
  });
});
