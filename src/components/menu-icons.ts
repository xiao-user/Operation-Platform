import type { Component } from "vue";
import {
  Calendar,
  ChatLineRound,
  Coin,
  DataAnalysis,
  Document,
  Grid,
  HomeFilled,
  Lock,
  Menu as MenuIcon,
  Notebook,
  OfficeBuilding,
  Setting,
  Tickets,
  User,
} from "@element-plus/icons-vue";
import type { MenuIconKey } from "@/types/navigation";

const iconMap: Record<MenuIconKey, Component> = {
  grid: Grid,
  notebook: Notebook,
  chat: ChatLineRound,
  calendar: Calendar,
  house: HomeFilled,
  money: Coin,
  shield: Lock,
  setting: Setting,
  menu: MenuIcon,
  data: DataAnalysis,
  document: Document,
  coin: Coin,
  office: OfficeBuilding,
  user: User,
  list: Tickets,
};

export function resolveMenuIcon(icon: MenuIconKey | null | undefined) {
  return icon ? iconMap[icon] || MenuIcon : MenuIcon;
}

