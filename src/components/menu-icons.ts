import { defineAsyncComponent, type Component } from "vue";
import {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChartColumn,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Contact,
  Database,
  FileText,
  Folder,
  GraduationCap,
  House,
  Images,
  Landmark,
  LayoutGrid,
  List,
  Lock,
  Menu,
  MessageSquareText,
  NotebookTabs,
  School,
  Settings,
  Shield,
  User,
  Users,
  Vote,
} from "@lucide/vue";
import type { MenuIconKey } from "@/types/navigation";

const legacyIconAliases: Record<string, string> = {
  grid: "LayoutGrid",
  notebook: "NotebookTabs",
  chat: "MessageSquareText",
  calendar: "Calendar",
  house: "House",
  money: "CircleDollarSign",
  shield: "Shield",
  setting: "Settings",
  menu: "Menu",
  data: "ChartNoAxesCombined",
  document: "FileText",
  coin: "Coins",
  office: "Building2",
  user: "User",
  list: "List",
};

const staticIconMap: Record<string, Component> = {
  Activity,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calendar,
  ChartColumn,
  ChartNoAxesCombined,
  CircleDollarSign,
  ClipboardList,
  Coins,
  Contact,
  Database,
  FileText,
  Folder,
  GraduationCap,
  House,
  Images,
  Landmark,
  LayoutGrid,
  List,
  Lock,
  Menu,
  MessageSquareText,
  NotebookTabs,
  School,
  Settings,
  Shield,
  User,
  Users,
  Vote,
};

const asyncIconCache = new Map<string, Component>();

export function toReadableMenuIconLabel(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .trim();
}

export function normalizeMenuIconKey(icon: MenuIconKey | null | undefined) {
  if (!icon) return "Menu";
  return legacyIconAliases[icon] ?? icon;
}

export function resolveMenuIcon(icon: MenuIconKey | null | undefined) {
  const normalized = normalizeMenuIconKey(icon);
  if (staticIconMap[normalized]) return staticIconMap[normalized];
  if (asyncIconCache.has(normalized)) return asyncIconCache.get(normalized)!;

  const asyncIcon = defineAsyncComponent({
    loader: async () => {
      const module = await import("@lucide/vue");
      const icons = module.icons as Record<string, Component>;
      return icons[normalized] ?? Menu;
    },
  });
  asyncIconCache.set(normalized, asyncIcon);
  return asyncIcon;
}

export function menuIconLabel(icon: MenuIconKey | null | undefined) {
  const normalized = normalizeMenuIconKey(icon);
  return toReadableMenuIconLabel(normalized);
}
