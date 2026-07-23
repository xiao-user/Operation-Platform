import { describe, expect, it } from "vitest";
import sharedShellSource from "../components/DigitalTwinDashboardShell.vue?raw";
import sharedWorkspaceSource from "../components/DigitalTwinMapWorkspace.vue?raw";
import sharedTopbarSource from "../components/DigitalTwinTopbar.vue?raw";
import sharedSessionSource from "../use-digital-twin-dashboard-session.ts?raw";
import sharedTenantMapSource from "../tenant-map-data-source.ts?raw";
import regionalViewSource from "../../../views/bureau/visualization/RegionalEducationOverviewView.vue?raw";
import regionalTenantMapSource from "../../regional-education-overview/tenant-map-data-source.ts?raw";
import sportsViewSource from "../../../views/bureau/visualization/SmartSportsDashboardView.vue?raw";
import sportsHudSource from "../../smart-sports-dashboard/components/SmartSportsDashboardHud.vue?raw";
import sportsTenantMapSource from "../../smart-sports-dashboard/tenant-map-data-source.ts?raw";

describe("digital twin business boundaries", () => {
  it("keeps the shared foundation independent from both business modules", () => {
    for (const moduleSource of [
      sharedShellSource,
      sharedWorkspaceSource,
      sharedTopbarSource,
      sharedSessionSource,
      sharedTenantMapSource,
    ]) {
      expect(moduleSource).not.toMatch(
        /@\/features\/(?:regional-education-overview|smart-sports-dashboard)\//,
      );
    }
  });

  it("keeps regional navigation and academic pages out of the smart sports entry", () => {
    for (const moduleSource of [sportsViewSource, sportsHudSource, sportsTenantMapSource]) {
      expect(moduleSource).not.toMatch(
        /AcademicQualityDashboard|DashboardSectionTabs|DigitalTwinStatusBar|dashboard-sections/,
      );
      expect(moduleSource).not.toMatch(/@\/features\/regional-education-overview\//);
    }
  });

  it("keeps regional navigation and academic pages owned by the regional shell", () => {
    expect(regionalViewSource).toContain("AcademicQualityDashboard");
    expect(regionalViewSource).toContain("DashboardSectionTabs");
    expect(regionalViewSource).toContain("DigitalTwinStatusBar");
    expect(regionalViewSource).toContain("dashboard-sections");
    expect(regionalViewSource).not.toContain("@/features/smart-sports-dashboard/");
    expect(regionalTenantMapSource).not.toContain("@/features/smart-sports-dashboard/");
  });
});
