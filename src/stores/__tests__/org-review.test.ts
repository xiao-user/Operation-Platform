import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { orgReviewRepository } from "@/features/org-review/org-review-repository";
import { useOrgReviewStore } from "@/stores/org-review";
import type { OrgReviewRow, PageResult } from "@/features/org-review/org-review-repository";

vi.mock("@/features/org-review/org-review-repository", () => ({
  REVIEW_STATUS_MAP: {
    pending: { label: "待审核", color: "#2D55EB" },
    approved: { label: "审核通过", color: "#0ED57D" },
    rejected: { label: "审核不通过", color: "#F52F3E" },
  },
  SEMESTER_OPTIONS: [],
  orgReviewRepository: {
    list: vi.fn(),
    detail: vi.fn(),
    updateStatus: vi.fn(),
  },
}));

function row(id: number, orgName: string): OrgReviewRow {
  return {
    id,
    orgNo: `ORG-${id}`,
    orgName,
    reviewStatus: "pending",
    remark: "",
    inLibrary: "in",
    contact: "联系人",
    phone: "13900000000",
    address: "测试地址",
  };
}

describe("org review store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("keeps the latest list response when earlier requests finish later", async () => {
    const listMock = vi.mocked(orgReviewRepository.list);
    let resolveFirst!: (result: PageResult<OrgReviewRow>) => void;
    listMock
      .mockReturnValueOnce(new Promise((resolve) => {
        resolveFirst = resolve;
      }))
      .mockResolvedValueOnce({ list: [row(2, "新查询机构")], total: 1 });

    const store = useOrgReviewStore();
    const firstLoad = store.loadList();
    store.filterForm.orgName = "新查询";
    const secondLoad = store.loadList();
    await secondLoad;
    resolveFirst({ list: [row(1, "旧查询机构")], total: 1 });
    await firstLoad;

    expect(store.tableData).toEqual([expect.objectContaining({ id: 2 })]);
    expect(store.pagination.total).toBe(1);
    expect(store.loading).toBe(false);
  });
});
