import * as THREE from "three";

export function themeColor(value: string, fallback = "#FFFFFF") {
  const match = value.match(
    /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)$/i,
  );
  if (!match) return { color: new THREE.Color(value || fallback), opacity: 1 };
  const [, red = "0", green = "0", blue = "0", alpha = "1"] = match;
  return {
    color: new THREE.Color(Number(red) / 255, Number(green) / 255, Number(blue) / 255),
    opacity: Number(alpha),
  };
}
