export type ReviewStatus = "pending" | "approved" | "rejected";
export type LibraryStatus = "in" | "out";

export interface OrgReviewRow {
  id: number;
  orgNo: string;
  orgName: string;
  reviewStatus: ReviewStatus;
  remark: string;
  inLibrary: LibraryStatus;
  contact: string;
  phone: string;
  address: string;
}

export interface OrgReviewFilter {
  reviewStatus: ReviewStatus | "";
  orgName: string;
  semester: string;
  inLibrary: LibraryStatus | "";
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export const SEMESTER_OPTIONS = [
  { label: "2025-2026学年第一学期", value: "2025-2026-1" },
  { label: "2025-2026学年第二学期", value: "2025-2026-2" },
  { label: "2026-2027学年第一学期", value: "2026-2027-1" },
];

export const REVIEW_STATUS_MAP: Record<ReviewStatus, { label: string; color: string }> = {
  pending: { label: "待审核", color: "#2D55EB" },
  approved: { label: "审核通过", color: "#0ED57D" },
  rejected: { label: "审核不通过", color: "#F52F3E" },
};
