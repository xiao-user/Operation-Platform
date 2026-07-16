export type EducationLocationType =
  | "bureau"
  | "primary"
  | "junior"
  | "senior"
  | "comprehensive"
  | "vocational";

export interface EducationLocation {
  id: string;
  name: string;
  type: EducationLocationType;
  coordinate: readonly [number, number];
  source: "OpenStreetMap" | "public-address-approximation";
  sourceId?: string;
  note?: string;
}

export interface EducationLocationTypeMeta {
  label: string;
  shortLabel: string;
  color: string;
}

export interface MapCameraView {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}
