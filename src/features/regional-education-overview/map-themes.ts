export interface DigitalTwinMapTheme {
  id: "lime" | "cyan" | "amber" | "royal";
  name: string;
  description: string;
  primary: string;
  outline: string;
  internalLine: string;
  topFill: string;
  topOpacity: number;
  sideTop: string;
  sideBottom: string;
  labelText: string;
  labelBorder: string;
  labelGlow: string;
  labelPointer: string;
  scatter: string;
  ripple: string;
  flyLine: string;
  hudRing: string;
  chaseLightHead: string;
  chaseLightTail: string;
  pageBackground: string;
  pageText: string;
  pageMuted: string;
  pageLine: string;
}

export const digitalTwinMapThemes: readonly DigitalTwinMapTheme[] = [
  {
    id: "lime",
    name: "生态荧光",
    description: "生态资源态势",
    primary: "#04E86C",
    outline: "#D4E994",
    internalLine: "rgba(212,233,148,0.42)",
    topFill: "#11170F",
    topOpacity: 0.9,
    sideTop: "#28E28B",
    sideBottom: "#E1FF00",
    labelText: "#E9F1D2",
    labelBorder: "rgba(212,233,148,0.58)",
    labelGlow: "rgba(4,232,108,0.24)",
    labelPointer: "#04E86C",
    scatter: "#04E86C",
    ripple: "rgba(4,232,108,0.34)",
    flyLine: "rgba(203,221,139,0.76)",
    hudRing: "rgba(4,232,108,0.16)",
    chaseLightHead: "#FFFFFF",
    chaseLightTail: "rgba(255,255,255,0)",
    pageBackground: "#0B100D",
    pageText: "#E8EEE4",
    pageMuted: "rgba(205,218,199,0.56)",
    pageLine: "rgba(4,232,108,0.24)",
  },
  {
    id: "cyan",
    name: "深海矩阵",
    description: "空间治理态势",
    primary: "#2FFEFE",
    outline: "#7CB3FF",
    internalLine: "rgba(124,179,255,0.42)",
    topFill: "#0C1421",
    topOpacity: 0.9,
    sideTop: "#00EEFF",
    sideBottom: "#0AFFD6",
    labelText: "#E3ECF8",
    labelBorder: "rgba(124,179,255,0.58)",
    labelGlow: "rgba(47,254,254,0.24)",
    labelPointer: "#2FFEFE",
    scatter: "#2FFEFE",
    ripple: "rgba(47,254,254,0.34)",
    flyLine: "rgba(148,186,240,0.76)",
    hudRing: "rgba(47,254,254,0.16)",
    chaseLightHead: "#FFFFFF",
    chaseLightTail: "rgba(255,255,255,0)",
    pageBackground: "#0A0F17",
    pageText: "#E8EDF5",
    pageMuted: "rgba(200,210,225,0.56)",
    pageLine: "rgba(47,254,254,0.24)",
  },
  {
    id: "amber",
    name: "城市琥珀",
    description: "质量预警态势",
    primary: "#FFD03B",
    outline: "#F0C383",
    internalLine: "rgba(240,195,131,0.42)",
    topFill: "#19140E",
    topOpacity: 0.9,
    sideTop: "#FFF700",
    sideBottom: "#FA9E00",
    labelText: "#F3E9DA",
    labelBorder: "rgba(240,195,131,0.58)",
    labelGlow: "rgba(255,208,59,0.24)",
    labelPointer: "#FFD03B",
    scatter: "#FFD03B",
    ripple: "rgba(255,208,59,0.34)",
    flyLine: "rgba(229,195,145,0.76)",
    hudRing: "rgba(255,208,59,0.16)",
    chaseLightHead: "#FFFFFF",
    chaseLightTail: "rgba(255,255,255,0)",
    pageBackground: "#110E0A",
    pageText: "#F0EBE4",
    pageMuted: "rgba(221,207,187,0.56)",
    pageLine: "rgba(255,208,59,0.24)",
  },
  {
    id: "royal",
    name: "星河钴蓝",
    description: "教育数字态势",
    primary: "#2B67D1",
    outline: "#78A8FF",
    internalLine: "rgba(120,168,255,0.42)",
    topFill: "#0B1324",
    topOpacity: 0.9,
    sideTop: "#2B67D1",
    sideBottom: "#75B8FF",
    labelText: "#E7EFFF",
    labelBorder: "rgba(120,168,255,0.58)",
    labelGlow: "rgba(43,103,209,0.3)",
    labelPointer: "#2B67D1",
    scatter: "#2B67D1",
    ripple: "rgba(43,103,209,0.38)",
    flyLine: "rgba(120,168,255,0.78)",
    hudRing: "rgba(43,103,209,0.2)",
    chaseLightHead: "#FFFFFF",
    chaseLightTail: "rgba(255,255,255,0)",
    pageBackground: "#080F1D",
    pageText: "#E8EFFF",
    pageMuted: "rgba(199,213,239,0.58)",
    pageLine: "rgba(43,103,209,0.3)",
  },
] as const;

const defaultDigitalTwinMapTheme: DigitalTwinMapTheme = digitalTwinMapThemes[1]!;

export function getDigitalTwinMapTheme(themeId: DigitalTwinMapTheme["id"]) {
  return digitalTwinMapThemes.find((theme) => theme.id === themeId)
    ?? defaultDigitalTwinMapTheme;
}
