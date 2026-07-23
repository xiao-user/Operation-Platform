import type {
  EducationLocation,
  EducationLocationType,
  EducationLocationTypeMeta,
} from "./types";
import { wgs84ToGcj02 } from "./coordinate-system";

export const educationLocationTypeMeta: Record<
  EducationLocationType,
  EducationLocationTypeMeta
> = {
  bureau: { label: "教育局", shortLabel: "局", color: "#f4ff7a" },
  primary: { label: "小学", shortLabel: "小", color: "#38e8ff" },
  junior: { label: "初中", shortLabel: "初", color: "#69ffba" },
  senior: { label: "高中", shortLabel: "高", color: "#ffcf5c" },
  comprehensive: { label: "综合学校", shortLabel: "综", color: "#a58bff" },
  vocational: { label: "中职院校", shortLabel: "职", color: "#ff7fa7" },
};

/**
 * 首版点位来自 OpenStreetMap 榕城区行政关系（relation 3283326）内的 school POI。
 * 学校类型按公开名称作演示性归类，教育局坐标按公开办公地址“空港大道西段”近似落点。
 * 正式上线前必须用教育局权威台账校准隶属关系、类型与坐标。
 */
type LegacyWgs84EducationLocation = Omit<EducationLocation, "coordinateSystem">;

const legacyWgs84EducationLocations: readonly LegacyWgs84EducationLocation[] = [
  {
    id: "rongcheng-education-bureau",
    name: "榕城区教育局",
    type: "bureau",
    coordinate: [116.4085, 23.5075],
    source: "public-address-approximation",
    note: "依据公开办公地址近似落点，待权威坐标校准",
  },
  { id: "osm-1", name: "凤岐华侨学校", type: "comprehensive", coordinate: [116.2941067, 23.4705592], source: "OpenStreetMap", sourceId: "1" },
  { id: "osm-2", name: "西岐学校", type: "comprehensive", coordinate: [116.3367721, 23.4816987], source: "OpenStreetMap", sourceId: "2" },
  { id: "osm-3", name: "京北小学", type: "primary", coordinate: [116.4179671, 23.4876989], source: "OpenStreetMap", sourceId: "3" },
  { id: "osm-4", name: "揭阳市卫生学校", type: "vocational", coordinate: [116.4181048, 23.5014236], source: "OpenStreetMap", sourceId: "4" },
  { id: "osm-5", name: "京南小学", type: "primary", coordinate: [116.4238792, 23.4850637], source: "OpenStreetMap", sourceId: "5" },
  { id: "osm-6", name: "京冈中学", type: "junior", coordinate: [116.4264567, 23.4950234], source: "OpenStreetMap", sourceId: "6" },
  { id: "osm-7", name: "揭阳第一中学（榕江新城）", type: "senior", coordinate: [116.4316613, 23.5007772], source: "OpenStreetMap", sourceId: "7" },
  { id: "osm-8", name: "揭阳市综合中等专业学校", type: "vocational", coordinate: [116.4219618, 23.5018413], source: "OpenStreetMap", sourceId: "8" },
  { id: "osm-9", name: "凤南学校", type: "comprehensive", coordinate: [116.4337913, 23.4950811], source: "OpenStreetMap", sourceId: "9" },
  { id: "osm-10", name: "金都初级中学", type: "junior", coordinate: [116.5517347, 23.4493633], source: "OpenStreetMap", sourceId: "10" },
  { id: "osm-11", name: "石牌中学", type: "junior", coordinate: [116.5224453, 23.4943872], source: "OpenStreetMap", sourceId: "11" },
  { id: "osm-12", name: "揭阳华侨初级中学", type: "junior", coordinate: [116.3502916, 23.530988], source: "OpenStreetMap", sourceId: "12" },
  { id: "osm-13", name: "新兴学校", type: "comprehensive", coordinate: [116.3635304, 23.5313043], source: "OpenStreetMap", sourceId: "13" },
  { id: "osm-14", name: "揭阳师范附属小学", type: "primary", coordinate: [116.3548049, 23.5308742], source: "OpenStreetMap", sourceId: "14" },
  { id: "osm-15", name: "北市小学", type: "primary", coordinate: [116.3462411, 23.5395828], source: "OpenStreetMap", sourceId: "15" },
  { id: "osm-16", name: "榕江中学", type: "junior", coordinate: [116.3422584, 23.5403472], source: "OpenStreetMap", sourceId: "16" },
  { id: "osm-17", name: "揭阳一中众智外国语学校", type: "comprehensive", coordinate: [116.3434875, 23.5419763], source: "OpenStreetMap", sourceId: "17" },
  { id: "osm-18", name: "思贤中学", type: "junior", coordinate: [116.3495456, 23.5394596], source: "OpenStreetMap", sourceId: "18" },
  { id: "osm-19", name: "揭阳第二中学", type: "senior", coordinate: [116.3574417, 23.5339888], source: "OpenStreetMap", sourceId: "19" },
  { id: "osm-20", name: "榕城上义学校", type: "comprehensive", coordinate: [116.3649933, 23.5342774], source: "OpenStreetMap", sourceId: "20" },
  { id: "osm-21", name: "揭阳第一中学（老校区）", type: "senior", coordinate: [116.3453574, 23.545654], source: "OpenStreetMap", sourceId: "21" },
  { id: "osm-22", name: "榕城区实验学校", type: "comprehensive", coordinate: [116.3447133, 23.5537075], source: "OpenStreetMap", sourceId: "22" },
  { id: "osm-23", name: "揭阳真理中学", type: "senior", coordinate: [116.358131, 23.5451902], source: "OpenStreetMap", sourceId: "23" },
  { id: "osm-24", name: "榕城义和学校", type: "comprehensive", coordinate: [116.3715153, 23.5344838], source: "OpenStreetMap", sourceId: "24" },
  { id: "osm-25", name: "运通小学", type: "primary", coordinate: [116.3691643, 23.5355035], source: "OpenStreetMap", sourceId: "25" },
  { id: "osm-26", name: "邱金元纪念中学", type: "junior", coordinate: [116.3703311, 23.5353657], source: "OpenStreetMap", sourceId: "26" },
  { id: "osm-27", name: "揭阳真理中学分教处", type: "junior", coordinate: [116.3725691, 23.5399525], source: "OpenStreetMap", sourceId: "27" },
  { id: "osm-28", name: "揭阳华侨中学", type: "senior", coordinate: [116.3908057, 23.55325], source: "OpenStreetMap", sourceId: "28" },
  { id: "osm-29", name: "揭阳市华侨高级中学（南区）", type: "senior", coordinate: [116.3910324, 23.548163], source: "OpenStreetMap", sourceId: "29" },
  { id: "osm-30", name: "揭阳市第二实验小学", type: "primary", coordinate: [116.3842159, 23.5551337], source: "OpenStreetMap", sourceId: "30" },
  { id: "osm-31", name: "揭阳市实验中学", type: "junior", coordinate: [116.3599294, 23.5620445], source: "OpenStreetMap", sourceId: "31" },
  { id: "osm-32", name: "揭阳市实验小学", type: "primary", coordinate: [116.3609132, 23.5620983], source: "OpenStreetMap", sourceId: "32" },
  { id: "osm-33", name: "岐山中学", type: "junior", coordinate: [116.3602094, 23.5778831], source: "OpenStreetMap", sourceId: "33" },
  { id: "osm-34", name: "岐山学校", type: "comprehensive", coordinate: [116.3739915, 23.5664227], source: "OpenStreetMap", sourceId: "34" },
  { id: "osm-35", name: "德才实验学校", type: "comprehensive", coordinate: [116.3797435, 23.5666646], source: "OpenStreetMap", sourceId: "35" },
  { id: "osm-36", name: "渔湖中学", type: "senior", coordinate: [116.4178875, 23.5188124], source: "OpenStreetMap", sourceId: "36" },
  { id: "osm-37", name: "金英实验学校（渔湖校区）", type: "comprehensive", coordinate: [116.4369018, 23.5157195], source: "OpenStreetMap", sourceId: "37" },
  { id: "osm-38", name: "团友学校", type: "comprehensive", coordinate: [116.4227941, 23.5226848], source: "OpenStreetMap", sourceId: "38" },
  { id: "osm-39", name: "塘埔学校", type: "comprehensive", coordinate: [116.4406811, 23.5208801], source: "OpenStreetMap", sourceId: "39" },
  { id: "osm-40", name: "溪南中学", type: "junior", coordinate: [116.4259097, 23.5531227], source: "OpenStreetMap", sourceId: "40" },
  { id: "osm-41", name: "揭阳技师学院", type: "vocational", coordinate: [116.4708331, 23.5182779], source: "OpenStreetMap", sourceId: "41" },
  { id: "osm-42", name: "竞智学校", type: "comprehensive", coordinate: [116.4736535, 23.5067477], source: "OpenStreetMap", sourceId: "42" },
  { id: "osm-43", name: "新华中学", type: "junior", coordinate: [116.4973452, 23.5242038], source: "OpenStreetMap", sourceId: "43" },
] as const;

export const rongchengEducationLocations: readonly EducationLocation[] =
  legacyWgs84EducationLocations.map((location) => ({
    ...location,
    coordinate: wgs84ToGcj02(location.coordinate),
    coordinateSystem: "GCJ-02",
  }));

export const schoolLocations = rongchengEducationLocations.filter(
  (location) => location.type !== "bureau",
);

export function countLocationsByType(locations: readonly EducationLocation[]) {
  return locations.reduce<Record<EducationLocationType, number>>(
    (counts, location) => {
      counts[location.type] += 1;
      return counts;
    },
    { bureau: 0, primary: 0, junior: 0, senior: 0, comprehensive: 0, vocational: 0 },
  );
}
