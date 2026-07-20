import { describe, expect, it } from "vitest";
import {
  APPLICATION_TITLE,
  resolveDocumentTitle,
} from "@/router/document-title";

describe("resolveDocumentTitle", () => {
  it("uses a stable title before authentication initializes", () => {
    expect(resolveDocumentTitle({
      authInitialized: false,
      authenticated: false,
      routeTitle: "工作台",
    })).toBe(APPLICATION_TITLE);
  });

  it("uses a dedicated login title for signed-out users", () => {
    expect(resolveDocumentTitle({
      authInitialized: true,
      authenticated: false,
    })).toBe("登录");
  });

  it("combines the selected menu and tenant for signed-in users", () => {
    expect(resolveDocumentTitle({
      authInitialized: true,
      authenticated: true,
      routeTitle: "功能开发中",
      navigationTitle: "设备列表",
      tenantName: "体育东路小学",
    })).toBe("设备列表 - 体育东路小学");
  });

  it("falls back to route metadata for standalone pages", () => {
    expect(resolveDocumentTitle({
      authInitialized: true,
      authenticated: true,
      routeTitle: "区域教育总览",
      tenantName: "榕城区教育局",
    })).toBe("区域教育总览 - 榕城区教育局");
  });

  it("does not repeat identical page and tenant names", () => {
    expect(resolveDocumentTitle({
      authInitialized: true,
      authenticated: true,
      routeTitle: "运营管理平台",
      tenantName: "运营管理平台",
    })).toBe("运营管理平台");
  });
});
