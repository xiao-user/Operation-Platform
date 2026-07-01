import type { Component } from "vue";
import { icons as lucideIcons } from "@lucide/vue";
import { toReadableMenuIconLabel } from "@/components/menu-icons";
import type { MenuIconKey } from "@/types/navigation";

export interface MenuIconOption {
  key: MenuIconKey;
  label: string;
  component: Component;
}

const preferredIconOrder = [
  "LayoutGrid",
  "House",
  "School",
  "GraduationCap",
  "BookOpen",
  "NotebookTabs",
  "MessageSquareText",
  "Calendar",
  "Bell",
  "ClipboardList",
  "FileText",
  "Folder",
  "Users",
  "User",
  "Contact",
  "Building2",
  "Landmark",
  "BriefcaseBusiness",
  "Shield",
  "Lock",
  "Settings",
  "ChartNoAxesCombined",
  "ChartColumn",
  "Database",
  "Coins",
  "CircleDollarSign",
  "Images",
  "Vote",
  "Menu",
];

function compareIconOptions(a: MenuIconOption, b: MenuIconOption) {
  const aPreferred = preferredIconOrder.indexOf(a.key);
  const bPreferred = preferredIconOrder.indexOf(b.key);
  if (aPreferred !== -1 || bPreferred !== -1) {
    if (aPreferred === -1) return 1;
    if (bPreferred === -1) return -1;
    return aPreferred - bPreferred;
  }
  return a.label.localeCompare(b.label, "en-US");
}

export const menuIconOptions: MenuIconOption[] = Object.entries(
  lucideIcons as Record<string, Component>,
)
  .filter(([, component]) => typeof component === "function")
  .map(([key, component]) => ({
    key,
    label: toReadableMenuIconLabel(key),
    component,
  }))
  .sort(compareIconOptions);
