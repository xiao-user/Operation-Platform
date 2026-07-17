import { dataBackend } from "@/config/runtime-providers";
import { getSupabaseClient } from "@/lib/supabase";
import {
  REVIEW_STATUS_MAP,
  SEMESTER_OPTIONS,
  type OrgReviewFilter,
  type OrgReviewRow,
  type PageResult,
  type ReviewStatus,
} from "@/features/org-review/types";

export {
  REVIEW_STATUS_MAP,
  SEMESTER_OPTIONS,
  type OrgReviewFilter,
  type OrgReviewRow,
  type PageResult,
  type ReviewStatus,
};

interface OrgReviewRowDto {
  id: number;
  org_no: string;
  org_name: string;
  review_status: ReviewStatus;
  remark: string;
  in_library: "in" | "out";
  contact: string;
  phone: string;
  address: string;
}

export interface OrgReviewDetailData {
  hasChange: boolean;
  avatar: string;
  region: string;
  legalPerson: string;
  creditCode: string;
  licenseNo: string;
  website: string;
  businessScope: string;
  licenseValidRange: string;
  licenseImages: string[];
  businessValidRange: string;
  businessImages: string[];
  idCardFront: string;
  idCardBack: string;
  commitmentImages: string[];
}

export interface OrgReviewDetail extends OrgReviewRow {
  detail?: Partial<OrgReviewDetailData>;
}

export interface OrgReviewRepository {
  list(
    tenantId: string,
    filter: OrgReviewFilter,
    page: number,
    pageSize: number,
  ): Promise<PageResult<OrgReviewRow>>;
  detail(tenantId: string, id: number): Promise<OrgReviewDetail | undefined>;
  updateStatus(
    tenantId: string,
    id: number,
    status: ReviewStatus,
    remark?: string,
  ): Promise<boolean>;
}

function toOrgReviewRow(row: OrgReviewRowDto): OrgReviewRow {
  return {
    id: Number(row.id),
    orgNo: row.org_no,
    orgName: row.org_name,
    reviewStatus: row.review_status,
    remark: row.remark,
    inLibrary: row.in_library,
    contact: row.contact,
    phone: row.phone,
    address: row.address,
  };
}

const localOrgReviewRepository: OrgReviewRepository = {
  async list(_tenantId, filter, page, pageSize) {
    const { fetchOrgReviewList } = await import("@/mock/bureau/custody/orgReview");
    return fetchOrgReviewList(filter, page, pageSize);
  },
  async detail(_tenantId, id) {
    const { fetchOrgDetail } = await import("@/mock/bureau/custody/orgReview");
    return fetchOrgDetail(id);
  },
  async updateStatus(_tenantId, id, status, remark) {
    const { updateOrgReviewStatus } = await import("@/mock/bureau/custody/orgReview");
    return updateOrgReviewStatus(id, status, remark);
  },
};

const supabaseOrgReviewRepository: OrgReviewRepository = {
  async list(tenantId, filter, page, pageSize) {
    const start = (page - 1) * pageSize;
    let query = getSupabaseClient()
      .from("org_review_applications")
      .select(
        "id,org_no,org_name,review_status,remark,in_library,contact,phone,address",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .order("id")
      .range(start, start + pageSize - 1);

    if (filter.reviewStatus) query = query.eq("review_status", filter.reviewStatus);
    if (filter.orgName.trim()) query = query.ilike("org_name", `%${filter.orgName.trim()}%`);
    if (filter.semester) query = query.eq("semester", filter.semester);
    if (filter.inLibrary) query = query.eq("in_library", filter.inLibrary);

    const { data, count, error } = await query;
    if (error) throw new Error(error.message || "机构审核列表读取失败");
    return {
      list: (data as OrgReviewRowDto[]).map(toOrgReviewRow),
      total: count ?? 0,
    };
  },

  async detail(tenantId, id) {
    const { data, error } = await getSupabaseClient()
      .from("org_review_applications")
      .select("id,org_no,org_name,review_status,remark,in_library,contact,phone,address,detail")
      .eq("tenant_id", tenantId)
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(error.message || "机构审核详情读取失败");
    if (!data) return undefined;
    const row = data as OrgReviewRowDto & { detail: Partial<OrgReviewDetailData> | null };
    return {
      ...toOrgReviewRow(row),
      detail: row.detail ?? undefined,
    };
  },

  async updateStatus(tenantId, id, status, remark) {
    const values: Record<string, string> = { review_status: status };
    if (remark !== undefined) values.remark = remark;
    if (status === "approved") values.in_library = "in";
    const { error } = await getSupabaseClient()
      .from("org_review_applications")
      .update(values)
      .eq("tenant_id", tenantId)
      .eq("id", id);
    if (error) throw new Error(error.message || "机构审核状态保存失败");
    return true;
  },
};

export const orgReviewRepository: OrgReviewRepository = dataBackend === "supabase"
  ? supabaseOrgReviewRepository
  : localOrgReviewRepository;
