import {
  fetchOrgDetail,
  fetchOrgReviewList,
  REVIEW_STATUS_MAP,
  SEMESTER_OPTIONS,
  updateOrgReviewStatus,
  type OrgReviewFilter,
  type OrgReviewRow,
  type PageResult,
  type ReviewStatus,
} from "@/mock/bureau/custody/orgReview";

export {
  REVIEW_STATUS_MAP,
  SEMESTER_OPTIONS,
  type OrgReviewFilter,
  type OrgReviewRow,
  type PageResult,
  type ReviewStatus,
};

export const orgReviewRepository = {
  list(
    filter: OrgReviewFilter,
    page: number,
    pageSize: number,
  ): Promise<PageResult<OrgReviewRow>> {
    return fetchOrgReviewList(filter, page, pageSize);
  },

  detail(id: number): Promise<OrgReviewRow | undefined> {
    return fetchOrgDetail(id);
  },

  updateStatus(id: number, status: ReviewStatus, remark?: string): Promise<boolean> {
    return updateOrgReviewStatus(id, status, remark);
  },
};
