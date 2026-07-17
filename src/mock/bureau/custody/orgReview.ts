/** 机构管理 · 审核列表的本地演示数据，仅由 local repository 动态加载。 */
import type {
  OrgReviewFilter,
  OrgReviewRow,
  PageResult,
  ReviewStatus,
} from "@/features/org-review/types";

export type {
  LibraryStatus,
  OrgReviewFilter,
  OrgReviewRow,
  PageResult,
  ReviewStatus,
} from "@/features/org-review/types";
export { REVIEW_STATUS_MAP, SEMESTER_OPTIONS } from "@/features/org-review/types";

const MOCK_LIST: OrgReviewRow[] = [
  {
    id: 1,
    orgNo: "20481939391450",
    orgName: "广州星光艺术培训中心",
    reviewStatus: "pending",
    remark: "材料完整，符合标准",
    inLibrary: "in",
    contact: "陈远远",
    phone: "13928373920",
    address: "天河区体育西路103号",
  },
  {
    id: 2,
    orgNo: "20481939391451",
    orgName: "深圳未来教育科技有限公司",
    reviewStatus: "rejected",
    remark: "资质证书已过期",
    inLibrary: "out",
    contact: "李明辉",
    phone: "13847288392",
    address: "南山区科技园南路18号",
  },
  {
    id: 3,
    orgNo: "20481939391452",
    orgName: "东莞博雅文化传播有限公司",
    reviewStatus: "approved",
    remark: "审核通过，材料齐全",
    inLibrary: "in",
    contact: "王思琪",
    phone: "13758922947",
    address: "莞城区东城大道56号",
  },
  {
    id: 4,
    orgNo: "20481939391453",
    orgName: "佛山启航体育发展有限公司",
    reviewStatus: "rejected",
    remark: "消防设施需更新",
    inLibrary: "out",
    contact: "张伟强",
    phone: "13667398573",
    address: "禅城区季华五路33号",
  },
  {
    id: 5,
    orgNo: "20481939391454",
    orgName: "珠海蓝天少儿编程教育",
    reviewStatus: "pending",
    remark: "教师资格待验证",
    inLibrary: "out",
    contact: "刘晓燕",
    phone: "13589372759",
    address: "香洲区人民东路228号",
  },
  {
    id: 6,
    orgNo: "20481939391455",
    orgName: "中山绿叶营养健康管理中心",
    reviewStatus: "rejected",
    remark: "食谱需营养师审核",
    inLibrary: "out",
    contact: "赵国栋",
    phone: "13475938642",
    address: "石岐区中山路168号",
  },
  {
    id: 7,
    orgNo: "20481939391456",
    orgName: "惠州阳光心理咨询服务中心",
    reviewStatus: "approved",
    remark: "场地合格，人员齐备",
    inLibrary: "in",
    contact: "孙丽华",
    phone: "13395739571",
    address: "惠城区麦地路12号",
  },
  {
    id: 8,
    orgNo: "20481939391457",
    orgName: "江门新世纪外语培训学校",
    reviewStatus: "rejected",
    remark: "保险单据缺失",
    inLibrary: "out",
    contact: "周建国",
    phone: "13285733864",
    address: "蓬江区建设路88号",
  },
  {
    id: 9,
    orgNo: "20481939391458",
    orgName: "肇庆智慧树早教中心",
    reviewStatus: "pending",
    remark: "收费标准需公示",
    inLibrary: "out",
    contact: "吴秀英",
    phone: "13147855927",
    address: "端州区天宁北路45号",
  },
  {
    id: 10,
    orgNo: "20481939391459",
    orgName: "清远翰林书画院",
    reviewStatus: "rejected",
    remark: "合同范本待备案",
    inLibrary: "out",
    contact: "郑志豪",
    phone: "13058922648",
    address: "清城区先锋路22号",
  },
  {
    id: 11,
    orgNo: "20481939391460",
    orgName: "汕头海韵音乐培训学校",
    reviewStatus: "pending",
    remark: "等待场地验收",
    inLibrary: "out",
    contact: "林海涛",
    phone: "13612345678",
    address: "金平区长平路156号",
  },
  {
    id: 12,
    orgNo: "20481939391461",
    orgName: "湛江阳光舞蹈艺术中心",
    reviewStatus: "approved",
    remark: "资质齐全，通过审核",
    inLibrary: "in",
    contact: "黄美玲",
    phone: "13723456789",
    address: "赤坎区南桥北路78号",
  },
  {
    id: 13,
    orgNo: "20481939391462",
    orgName: "茂名启智教育咨询有限公司",
    reviewStatus: "rejected",
    remark: "师资证明材料不全",
    inLibrary: "out",
    contact: "何志明",
    phone: "13834567890",
    address: "茂南区油城五路12号",
  },
  {
    id: 14,
    orgNo: "20481939391463",
    orgName: "梅州客家文化研学基地",
    reviewStatus: "pending",
    remark: "待补充营业执照副本",
    inLibrary: "out",
    contact: "钟文华",
    phone: "13945678901",
    address: "梅江区江南路99号",
  },
  {
    id: 15,
    orgNo: "20481939391464",
    orgName: "韶关丹霞户外拓展中心",
    reviewStatus: "approved",
    remark: "安全设施达标",
    inLibrary: "in",
    contact: "曾国平",
    phone: "13056789012",
    address: "浈江区风度北路36号",
  },
  {
    id: 16,
    orgNo: "20481939391465",
    orgName: "河源万绿湖生态教育基地",
    reviewStatus: "pending",
    remark: "环评报告待提交",
    inLibrary: "out",
    contact: "谢春花",
    phone: "13167890123",
    address: "源城区河源大道128号",
  },
  {
    id: 17,
    orgNo: "20481939391466",
    orgName: "阳江海陵岛研学旅行社",
    reviewStatus: "rejected",
    remark: "旅行社资质已过期",
    inLibrary: "out",
    contact: "陈海洋",
    phone: "13278901234",
    address: "江城区安宁路55号",
  },
  {
    id: 18,
    orgNo: "20481939391467",
    orgName: "揭阳榕城书法培训中心",
    reviewStatus: "approved",
    remark: "教师资格证齐全",
    inLibrary: "in",
    contact: "林书豪",
    phone: "13389012345",
    address: "榕城区临江北路77号",
  },
  {
    id: 19,
    orgNo: "20481939391468",
    orgName: "潮州陶瓷艺术工作室",
    reviewStatus: "pending",
    remark: "作品展示区待验收",
    inLibrary: "in",
    contact: "蔡艺文",
    phone: "13490123456",
    address: "湘桥区太平路188号",
  },
  {
    id: 20,
    orgNo: "20481939391469",
    orgName: "云浮新兴禅文化体验馆",
    reviewStatus: "rejected",
    remark: "消防通道被占用",
    inLibrary: "out",
    contact: "罗禅心",
    phone: "13501234567",
    address: "云城区云城大道66号",
  },
  {
    id: 21,
    orgNo: "20481939391470",
    orgName: "番禺大石少儿美术馆",
    reviewStatus: "approved",
    remark: "设施完善，通过审核",
    inLibrary: "in",
    contact: "方小敏",
    phone: "13612340001",
    address: "番禺区大石街道富丽路8号",
  },
  {
    id: 22,
    orgNo: "20481939391471",
    orgName: "花都狮岭皮具设计学院",
    reviewStatus: "pending",
    remark: "办学许可证待更新",
    inLibrary: "out",
    contact: "杨皮匠",
    phone: "13723450002",
    address: "花都区狮岭镇阳光路12号",
  },
  {
    id: 23,
    orgNo: "20481939391472",
    orgName: "增城荔枝湾自然教育营地",
    reviewStatus: "rejected",
    remark: "户外场地安全隐患",
    inLibrary: "out",
    contact: "廖荔红",
    phone: "13834560003",
    address: "增城区荔城街道荔乡路56号",
  },
  {
    id: 24,
    orgNo: "20481939391473",
    orgName: "从化温泉康养研学中心",
    reviewStatus: "approved",
    remark: "卫生许可证有效",
    inLibrary: "in",
    contact: "温泉生",
    phone: "13945670004",
    address: "从化区温泉镇温泉东路99号",
  },
  {
    id: 25,
    orgNo: "20481939391474",
    orgName: "南沙湿地生态科普基地",
    reviewStatus: "pending",
    remark: "科普资质待审批",
    inLibrary: "out",
    contact: "何湿地",
    phone: "13056780005",
    address: "南沙区万顷沙镇新港大道1号",
  },
  {
    id: 26,
    orgNo: "20481939391475",
    orgName: "白云机场航空体验教育中心",
    reviewStatus: "approved",
    remark: "合作协议已签署",
    inLibrary: "in",
    contact: "蓝天飞",
    phone: "13167890006",
    address: "白云区人和镇机场路168号",
  },
  {
    id: 27,
    orgNo: "20481939391476",
    orgName: "黄埔军事素质拓展训练营",
    reviewStatus: "rejected",
    remark: "教官资质证明缺失",
    inLibrary: "out",
    contact: "吴铁军",
    phone: "13278900007",
    address: "黄埔区长洲岛军校路1号",
  },
  {
    id: 28,
    orgNo: "20481939391477",
    orgName: "越秀北京路非遗传承工坊",
    reviewStatus: "pending",
    remark: "非遗传承人认证中",
    inLibrary: "in",
    contact: "古传承",
    phone: "13389010008",
    address: "越秀区北京路步行街218号",
  },
  {
    id: 29,
    orgNo: "20481939391478",
    orgName: "荔湾西关粤剧培训社",
    reviewStatus: "approved",
    remark: "文化部门已备案",
    inLibrary: "in",
    contact: "粤韵声",
    phone: "13490120009",
    address: "荔湾区恩宁路永庆坊3号",
  },
  {
    id: 30,
    orgNo: "20481939391479",
    orgName: "海珠琶洲数字创意学院",
    reviewStatus: "rejected",
    remark: "办公场地租赁合同到期",
    inLibrary: "out",
    contact: "数码通",
    phone: "13501230010",
    address: "海珠区琶洲大道东1号",
  },
];

/**
 * 获取审核列表（模拟分页 + 筛选）
 * 筛选和分页都是真实联动的
 */
export function fetchOrgReviewList(
  filter: OrgReviewFilter,
  page: number,
  pageSize: number,
): Promise<PageResult<OrgReviewRow>> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let list = [...MOCK_LIST];

      if (filter.reviewStatus) {
        list = list.filter((r) => r.reviewStatus === filter.reviewStatus);
      }
      if (filter.orgName) {
        list = list.filter((r) => r.orgName.includes(filter.orgName));
      }
      if (filter.inLibrary) {
        list = list.filter((r) => r.inLibrary === filter.inLibrary);
      }

      const total = list.length;
      const start = (page - 1) * pageSize;
      list = list.slice(start, start + pageSize);

      resolve({ list, total });
    }, 50);
  });
}

/**
 * 获取单条机构详情
 */
export function fetchOrgDetail(id: number): Promise<OrgReviewRow | undefined> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(MOCK_LIST.find((r) => r.id === id));
    }, 50);
  });
}

/**
 * 更新审核状态（真实修改 mock 数据，列表刷新后可见）
 */
export function updateOrgReviewStatus(
  id: number,
  status: ReviewStatus,
  remark?: string,
): Promise<boolean> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const item = MOCK_LIST.find((r) => r.id === id);
      if (item) {
        item.reviewStatus = status;
        if (remark !== undefined) item.remark = remark;
        if (status === "approved") item.inLibrary = "in";
      }
      resolve(true);
    }, 50);
  });
}
