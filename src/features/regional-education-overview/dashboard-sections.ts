export const regionalDashboardSections = [
  { id: "regional-overview", label: "区域教育总览", compactLabel: "区域总览", enabled: true },
  { id: "academic-quality", label: "学业质量监测", compactLabel: "学业质量", enabled: true },
  { id: "teacher-development", label: "教师发展分析", compactLabel: "教师发展", enabled: false },
  { id: "student-analysis", label: "学生情况分析", compactLabel: "学生分析", enabled: false },
  { id: "school-conditions", label: "办学条件及安全", compactLabel: "办学安全", enabled: false },
  { id: "education-efficiency", label: "教育投入与效能", compactLabel: "投入效能", enabled: false },
  { id: "digital-education", label: "数字教育实施", compactLabel: "数字教育", enabled: false },
  { id: "special-education", label: "学前/职教/特教情况", compactLabel: "特殊教育", enabled: false },
] as const;

export type RegionalDashboardSectionId = (typeof regionalDashboardSections)[number]["id"];

export function isRegionalDashboardSectionEnabled(id: RegionalDashboardSectionId) {
  return regionalDashboardSections.some((section) => section.id === id && section.enabled);
}
