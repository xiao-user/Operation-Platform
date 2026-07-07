import { reactive, ref } from "vue";
import { defineStore } from "pinia";
import {
  orgReviewRepository,
  type OrgReviewFilter,
  type OrgReviewRow,
  type ReviewStatus,
} from "@/features/org-review/org-review-repository";

export function defaultOrgReviewFilter(): OrgReviewFilter {
  return {
    reviewStatus: "",
    orgName: "",
    semester: "2025-2026-1",
    inLibrary: "",
  };
}

export const useOrgReviewStore = defineStore("org-review", () => {
  const loading = ref(false);
  const tableData = ref<OrgReviewRow[]>([]);
  const filterForm = reactive<OrgReviewFilter>(defaultOrgReviewFilter());
  const pagination = reactive({
    currentPage: 1,
    pageSize: 10,
    total: 0,
  });
  let requestSequence = 0;

  async function loadList() {
    const sequence = requestSequence + 1;
    requestSequence = sequence;
    loading.value = true;
    try {
      const { list, total } = await orgReviewRepository.list(
        { ...filterForm },
        pagination.currentPage,
        pagination.pageSize,
      );
      if (sequence !== requestSequence) return;
      tableData.value = list;
      pagination.total = total;
    } finally {
      if (sequence === requestSequence) loading.value = false;
    }
  }

  async function search() {
    pagination.currentPage = 1;
    await loadList();
  }

  async function setPageSize(size: number) {
    pagination.pageSize = size;
    pagination.currentPage = 1;
    await loadList();
  }

  async function setPage(page: number) {
    pagination.currentPage = page;
    await loadList();
  }

  async function updateStatus(id: number, status: ReviewStatus, remark?: string) {
    await orgReviewRepository.updateStatus(id, status, remark);
    await loadList();
  }

  return {
    loading,
    tableData,
    filterForm,
    pagination,
    loadList,
    search,
    setPageSize,
    setPage,
    updateStatus,
  };
});
