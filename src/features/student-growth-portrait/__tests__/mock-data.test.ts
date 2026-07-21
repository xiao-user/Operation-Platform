import { describe, expect, it } from "vitest";
import {
  followUpRecords,
  mockDataMeta,
  moreTopics,
  primaryTopics,
  schoolRecords,
  topicDefinitionByKey,
  topicDefinitions,
} from "../mock-data";

describe("student growth portrait mock contract", () => {
  it("covers every planned topic exactly once", () => {
    const navigationKeys = [...primaryTopics, ...moreTopics].map((topic) => topic.key);

    expect(navigationKeys).toHaveLength(10);
    expect(new Set(navigationKeys).size).toBe(10);
    expect(topicDefinitions.map((topic) => topic.key)).toHaveLength(8);
    expect(topicDefinitionByKey.size).toBe(8);
    expect(navigationKeys).toContain("mental-health");
  });

  it("keeps school aggregates internally valid", () => {
    expect(schoolRecords.length).toBeGreaterThanOrEqual(10);
    for (const school of schoolRecords) {
      expect(school.students).toBeGreaterThan(0);
      expect(school.completeness).toBeGreaterThanOrEqual(0);
      expect(school.completeness).toBeLessThanOrEqual(100);
      expect(school.fiveEducation).toBeGreaterThanOrEqual(0);
      expect(school.fiveEducation).toBeLessThanOrEqual(100);
    }
  });

  it("marks the dataset as replaceable mock data", () => {
    expect(mockDataMeta.sourceType).toBe("mock");
    expect(mockDataMeta.version).toBe("Mock v1");
    expect(mockDataMeta.schoolCount).toBeGreaterThan(schoolRecords.length);
  });

  it("keeps follow-up records at school aggregate level", () => {
    expect(followUpRecords).not.toHaveLength(0);
    expect(followUpRecords.every((record) => record.schoolCount > 0)).toBe(true);
    expect(followUpRecords.every((record) => record.schools.length > 0)).toBe(true);
  });
});
