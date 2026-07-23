import type {
  FollowUpRecord,
  SchoolGrowthRecord,
  StudentGrowthTopicDefinition,
  StudentGrowthTopicKey,
} from "./types";

export const mockDataMeta = {
  version: "Mock v1",
  updatedAt: "2026-07-21 09:30",
  schoolCount: 48,
  studentCount: 28643,
  sourceType: "mock" as const,
};

export const primaryTopics: Array<{ key: StudentGrowthTopicKey; label: string }> = [
  { key: "overview", label: "区域总览" },
  { key: "five-education", label: "五育评价" },
  { key: "academic", label: "学业发展" },
  { key: "sports-health", label: "运动健康" },
  { key: "mental-health", label: "心理健康" },
];

export const moreTopics: Array<{ key: StudentGrowthTopicKey; label: string }> = [
  { key: "honor", label: "荣誉发展" },
  { key: "growth-support", label: "成长培育" },
  { key: "behavior-life", label: "行为生活" },
  { key: "practice", label: "实践活动" },
  { key: "daily-evaluation", label: "日常评价" },
];

export const regionalTrend = {
  categories: ["2023上", "2023下", "2024上", "2024下", "2025上", "2025下"],
  series: [
    { name: "五育均衡指数", values: [71.2, 72.8, 75.3, 76.1, 78.4, 79.6] },
    { name: "学业进步指数", values: [70.1, 71.6, 74, 74.8, 76.9, 78.2] },
    { name: "体质健康指数", values: [60.4, 61.8, 63.2, 64.1, 65, 65.5] },
    { name: "活动参与指数", values: [62.4, 64, 65.8, 67.2, 68.9, 70.1] },
  ],
};

export const schoolRecords: SchoolGrowthRecord[] = [
  { id: "school-01", name: "体育东路小学海明学校", stage: "小学", students: 2501, fiveEducation: 78.6, academicProgress: 75.4, physicalHealth: 86.1, activityParticipation: 82.3, trend: "上升", attention: "保持优势，关注低年级学业基础" },
  { id: "school-02", name: "滨江第一小学", stage: "小学", students: 2183, fiveEducation: 76.9, academicProgress: 73.2, physicalHealth: 84.3, activityParticipation: 80.1, trend: "上升", attention: "艺术活动参与仍有提升空间" },
  { id: "school-03", name: "东湖路小学", stage: "小学", students: 2046, fiveEducation: 71.2, academicProgress: 69.3, physicalHealth: 79.6, activityParticipation: 74.8, trend: "平稳", attention: "五育结构均衡度低于区域均值" },
  { id: "school-04", name: "南苑小学", stage: "小学", students: 1876, fiveEducation: 68.5, academicProgress: 66.1, physicalHealth: 76.4, activityParticipation: 71.5, trend: "下降", attention: "学业进步与活动参与需联合研判" },
  { id: "school-05", name: "新城实验小学", stage: "小学", students: 2322, fiveEducation: 81.3, academicProgress: 78.6, physicalHealth: 88.7, activityParticipation: 84.9, trend: "上升", attention: "综合表现稳定，可沉淀经验" },
  { id: "school-06", name: "云山小学", stage: "小学", students: 1654, fiveEducation: 63.8, academicProgress: 60.2, physicalHealth: 70.6, activityParticipation: 66.3, trend: "下降", attention: "多项指标低于区域均值" },
  { id: "school-07", name: "朝阳小学", stage: "小学", students: 1921, fiveEducation: 75.4, academicProgress: 72, physicalHealth: 82, activityParticipation: 77.5, trend: "上升", attention: "发展态势稳定" },
  { id: "school-08", name: "启航小学", stage: "小学", students: 1489, fiveEducation: 59.6, academicProgress: 55.7, physicalHealth: 68.1, activityParticipation: 63.2, trend: "平稳", attention: "五育均衡与学业进步需同步提升" },
  { id: "school-09", name: "榕城实验中学", stage: "初中", students: 2832, fiveEducation: 79.2, academicProgress: 82.1, physicalHealth: 78.9, activityParticipation: 76.8, trend: "上升", attention: "学业进步明显，体育参与需关注" },
  { id: "school-10", name: "中关村中学知春分校", stage: "初中", students: 2210, fiveEducation: 72.4, academicProgress: 70.8, physicalHealth: 73.2, activityParticipation: 69.9, trend: "平稳", attention: "美育与劳育发展存在差异" },
  { id: "school-11", name: "榕城第一高中", stage: "高中", students: 3150, fiveEducation: 77.8, academicProgress: 80.3, physicalHealth: 71.6, activityParticipation: 68.2, trend: "上升", attention: "高年级体质健康变化较弱" },
  { id: "school-12", name: "榕城第二高中", stage: "高中", students: 2960, fiveEducation: 69.7, academicProgress: 67.2, physicalHealth: 69.4, activityParticipation: 64.7, trend: "下降", attention: "需关注发展增值与活动参与" },
];

export const followUpRecords: FollowUpRecord[] = [
  { id: "follow-01", title: "体质健康指数低于区域均值 10 分以上", domain: "运动健康", schoolCount: 8, schools: "东湖路小学、长岭小学等", status: "待研判", updatedAt: "2026-07-20" },
  { id: "follow-02", title: "低年级学业进步指数增幅低于区域均值", domain: "学业发展", schoolCount: 6, schools: "望江小学、育才小学等", status: "跟进中", updatedAt: "2026-07-19" },
  { id: "follow-03", title: "艺术活动参与率连续两个学期提升", domain: "实践活动", schoolCount: 5, schools: "实验小学、滨江小学等", status: "已改善", updatedAt: "2026-07-18" },
  { id: "follow-04", title: "日常评价改进项占比持续偏高", domain: "日常评价", schoolCount: 4, schools: "新城小学、启明小学等", status: "待研判", updatedAt: "2026-07-17" },
];

export const topicDefinitions: StudentGrowthTopicDefinition[] = [
  {
    key: "five-education",
    label: "五育评价",
    description: "从目标达成、评价结果和二级评价项观察区域五育发展结构。",
    metrics: [
      { label: "目标完成率", value: "88.8", unit: "%", change: "较上学期 +2.4", tone: "success" },
      { label: "五育均衡指数", value: "79.6", unit: "分", change: "较上学期 +1.2", tone: "primary" },
      { label: "评价覆盖率", value: "96.3", unit: "%", change: "覆盖 46 所学校", tone: "neutral" },
    ],
    chart: { type: "radar", title: "五育发展结构", categories: ["德育", "智育", "体育", "美育", "劳育"], series: [{ name: "本区域", values: [84.2, 88.6, 91.3, 82.1, 73.6] }, { name: "区域基准", values: [80, 82, 84, 78, 76] }], max: 100 },
    insights: ["体育与智育表现稳定，是当前区域优势维度。", "劳育目标完成率提升明显，但校际差异仍然较大。", "12 所学校的五育均衡指数低于区域均值。"],
    details: [
      { name: "德育", scope: "全学段", value: "84.2 分", change: "+2.3", status: "良好" },
      { name: "智育", scope: "全学段", value: "88.6 分", change: "+1.8", status: "优秀" },
      { name: "体育", scope: "全学段", value: "91.3 分", change: "+4.5", status: "优秀" },
      { name: "美育", scope: "全学段", value: "82.1 分", change: "+1.2", status: "良好" },
      { name: "劳育", scope: "全学段", value: "73.6 分", change: "+3.7", status: "需关注" },
    ],
    sourceLabel: "五育评价与综合评价模拟数据",
    comparableScope: "评价量表完成标准化后支持区域比较",
  },
  {
    key: "academic",
    label: "学业发展",
    description: "关注学科能力结构、排名百分位变化和连续考试发展轨迹。",
    metrics: [
      { label: "学业进步指数", value: "78.2", unit: "分", change: "较上学期 +1.3", tone: "primary" },
      { label: "持续进步学生", value: "6,842", unit: "人", change: "占有效样本 27.1%", tone: "success" },
      { label: "有效考试覆盖", value: "92.8", unit: "%", change: "同口径考试 18 场", tone: "neutral" },
    ],
    chart: { type: "line", title: "学业发展轨迹", categories: regionalTrend.categories, series: [{ name: "语文", values: [70, 71, 73, 75, 76, 78] }, { name: "数学", values: [68, 70, 72, 73, 75, 79] }, { name: "英语", values: [72, 72, 74, 76, 77, 78] }] },
    insights: ["数学学科近两个学期进步幅度最大。", "低年级学生的学业进步分布仍存在学校差异。", "跨校比较仅使用同范围、同口径考试数据。"],
    details: [
      { name: "语文学科", scope: "区域可比", value: "78.0 分", change: "+2.0", status: "良好" },
      { name: "数学学科", scope: "区域可比", value: "79.0 分", change: "+4.0", status: "优秀" },
      { name: "英语学科", scope: "区域可比", value: "78.0 分", change: "+1.0", status: "良好" },
      { name: "科学素养", scope: "仅校内纵向", value: "74.6 分", change: "+1.1", status: "平稳" },
    ],
    sourceLabel: "考试成绩与学科能力模拟数据",
    comparableScope: "统一考试区域可比，校本考试仅校内纵向",
  },
  {
    key: "honor",
    label: "荣誉发展",
    description: "按荣誉奖章、称号和奖项级别观察学生发展机会与成果覆盖。",
    metrics: [
      { label: "荣誉覆盖率", value: "42.6", unit: "%", change: "较上学期 +3.1", tone: "success" },
      { label: "每百人奖项", value: "18.4", unit: "项", change: "覆盖全部学段", tone: "primary" },
      { label: "区级以上奖项", value: "1,286", unit: "项", change: "同比 +8.6%", tone: "neutral" },
    ],
    chart: { type: "bar", title: "奖项级别分布", categories: ["国际级", "国家级", "省级", "市级", "区县级", "校级"], series: [{ name: "奖项数量", values: [18, 64, 186, 372, 646, 2958] }] },
    insights: ["区县级与校级奖项构成主要荣誉来源。", "荣誉覆盖率较上学期提升，但学校间机会差异仍需关注。", "展示同时使用总量与每百人指标，避免学校规模偏差。"],
    details: [
      { name: "学习类荣誉", scope: "全区域", value: "1,842 项", change: "+6.8%", status: "良好" },
      { name: "体育类荣誉", scope: "全区域", value: "986 项", change: "+9.2%", status: "优秀" },
      { name: "艺术类荣誉", scope: "全区域", value: "742 项", change: "+4.1%", status: "良好" },
      { name: "劳动实践荣誉", scope: "全区域", value: "318 项", change: "+1.3%", status: "平稳" },
    ],
    sourceLabel: "荣誉奖章、称号与奖项模拟数据",
    comparableScope: "按在籍学生规模标准化后区域可比",
  },
  {
    key: "sports-health",
    label: "运动健康",
    description: "汇总体质测试、AI体锻、AI体测与阳光长跑的参与和变化。",
    metrics: [
      { label: "体质健康优良率", value: "82.3", unit: "%", change: "较上学年 +1.8", tone: "success" },
      { label: "日常锻炼参与率", value: "76.8", unit: "%", change: "较上学期 +2.5", tone: "primary" },
      { label: "人均长跑里程", value: "42.6", unit: "km", change: "本学期累计", tone: "neutral" },
    ],
    chart: { type: "line", title: "运动健康发展趋势", categories: regionalTrend.categories, series: [{ name: "体质健康", values: [60.4, 61.8, 63.2, 64.1, 65, 65.5] }, { name: "锻炼参与", values: [64.2, 66.8, 69.4, 71.1, 74.3, 76.8] }, { name: "长跑达成", values: [58, 61, 64, 68, 71, 73] }] },
    insights: ["日常锻炼参与率持续提升。", "耐力类项目提升相对缓慢，需要加强日常锻炼支持。", "体质达标率按年级、性别和标准版本计算。"],
    details: [
      { name: "50 米跑", scope: "有效测试学生", value: "84.6% 达标", change: "+2.1", status: "良好" },
      { name: "心肺耐力", scope: "有效测试学生", value: "76.2% 达标", change: "+0.8", status: "平稳" },
      { name: "BMI", scope: "有效测试学生", value: "81.9% 正常", change: "+1.4", status: "良好" },
      { name: "AI 体锻", scope: "接入学校", value: "18.6 次/人", change: "+3.2", status: "优秀" },
    ],
    sourceLabel: "体测、AI体锻与阳光长跑模拟数据",
    comparableScope: "按统一体测标准区域可比",
  },
  {
    key: "growth-support",
    label: "成长培育",
    description: "观察班主任、导师、任课教师、同学、家庭和学生自评的支持覆盖。",
    metrics: [
      { label: "评语覆盖率", value: "93.6", unit: "%", change: "较上学期 +1.9", tone: "success" },
      { label: "人均成长反馈", value: "8.4", unit: "条", change: "本学期", tone: "primary" },
      { label: "反馈及时率", value: "89.2", unit: "%", change: "7 日内完成", tone: "neutral" },
    ],
    chart: { type: "bar", title: "多主体成长反馈", categories: ["班主任", "导师", "任课教师", "同学", "自评", "家长"], series: [{ name: "反馈覆盖率", values: [98, 82, 91, 76, 88, 72] }] },
    insights: ["班主任和任课教师反馈覆盖最稳定。", "家长评语覆盖率仍有提升空间。", "评语文本只做匿名主题汇总，不在区域层展示原文。"],
    details: [
      { name: "班主任评语", scope: "全学段", value: "98.0%", change: "+0.6", status: "优秀" },
      { name: "导师评语", scope: "试点学校", value: "82.0%", change: "+3.4", status: "良好" },
      { name: "学生自评", scope: "全学段", value: "88.0%", change: "+2.2", status: "良好" },
      { name: "家长评语", scope: "全学段", value: "72.0%", change: "+1.1", status: "需关注" },
    ],
    sourceLabel: "多主体成长评语模拟数据",
    comparableScope: "覆盖率区域可比，文本内容仅匿名分析",
  },
  {
    key: "behavior-life",
    label: "行为生活",
    description: "以图书馆、阅读、出勤、校园消费和健康服务观察支持需求。",
    metrics: [
      { label: "图书借阅覆盖率", value: "68.4", unit: "%", change: "较上学期 +4.2", tone: "success" },
      { label: "正常出勤率", value: "97.8", unit: "%", change: "较上月 +0.3", tone: "primary" },
      { label: "数据服务覆盖", value: "83.6", unit: "%", change: "消费医疗受限使用", tone: "neutral" },
    ],
    chart: { type: "pie", title: "阅读偏好结构", categories: ["文学", "艺术", "历史", "数理化", "社会科学", "其他"], series: [{ name: "阅读占比", values: [31, 16, 14, 20, 11, 8] }] },
    insights: ["文学与数理化类阅读占比最高。", "迟到和早退整体稳定，4 所学校异常时长需要复核。", "消费与医疗数据只用于生活保障，不进入学生综合评价。"],
    details: [
      { name: "图书馆到访", scope: "接入学校", value: "4.8 次/人", change: "+0.7", status: "良好" },
      { name: "图书借阅", scope: "接入学校", value: "3.6 本/人", change: "+0.5", status: "良好" },
      { name: "迟到率", scope: "全区域", value: "1.3%", change: "-0.2", status: "平稳" },
      { name: "生活保障", scope: "授权汇总", value: "83.6% 覆盖", change: "+1.2", status: "良好" },
    ],
    sourceLabel: "图书馆、考勤与生活服务模拟数据",
    comparableScope: "行为汇总区域可比，消费医疗严格受限",
  },
  {
    key: "practice",
    label: "实践活动",
    description: "观察实践活动参与率、类型覆盖和连续参与情况。",
    metrics: [
      { label: "实践活动参与率", value: "78.6", unit: "%", change: "较上学期 +3.7", tone: "success" },
      { label: "人均参与活动", value: "4.2", unit: "次", change: "本学期", tone: "primary" },
      { label: "活动类型覆盖", value: "92.4", unit: "%", change: "六类活动", tone: "neutral" },
    ],
    chart: { type: "bar", title: "实践活动类型分布", categories: ["德育", "智育", "体育", "美育", "劳育", "社团"], series: [{ name: "参与人次", values: [12800, 9600, 14200, 11800, 8200, 10400] }] },
    insights: ["体育与德育活动参与覆盖最广。", "劳育类活动参与仍低于其他类型。", "连续两个学期参与的学生比例达到 61.8%。"],
    details: [
      { name: "一年级", scope: "小学", value: "3.8 次/人", change: "+0.6", status: "良好" },
      { name: "二年级", scope: "小学", value: "4.1 次/人", change: "+0.7", status: "良好" },
      { name: "三年级", scope: "小学", value: "4.6 次/人", change: "+0.9", status: "优秀" },
      { name: "初中学段", scope: "初中", value: "3.6 次/人", change: "+0.2", status: "平稳" },
    ],
    sourceLabel: "实践与社团活动模拟数据",
    comparableScope: "按在籍学生规模标准化后区域可比",
  },
  {
    key: "daily-evaluation",
    label: "日常评价",
    description: "按表扬、改进项和评价主题观察日常表现变化。",
    metrics: [
      { label: "正向评价占比", value: "84.7", unit: "%", change: "较上学期 +1.6", tone: "success" },
      { label: "评价覆盖学生", value: "25,864", unit: "人", change: "覆盖率 90.3%", tone: "primary" },
      { label: "改进项闭环率", value: "76.2", unit: "%", change: "较上学期 +5.4", tone: "neutral" },
    ],
    chart: { type: "line", title: "日常评价结果趋势", categories: regionalTrend.categories, series: [{ name: "表扬占比", values: [78, 79, 80, 82, 83, 84.7] }, { name: "改进项闭环率", values: [62, 64, 68, 70, 73, 76.2] }] },
    insights: ["正向评价占比保持稳定提升。", "改进项闭环率近两个学期提升明显。", "不同学校评价频率存在差异，排名前需先统一口径。"],
    details: [
      { name: "学习习惯", scope: "全学段", value: "86.2% 正向", change: "+1.2", status: "良好" },
      { name: "行为规范", scope: "全学段", value: "88.4% 正向", change: "+0.8", status: "优秀" },
      { name: "合作参与", scope: "全学段", value: "82.1% 正向", change: "+2.1", status: "良好" },
      { name: "任务坚持", scope: "全学段", value: "74.6% 正向", change: "+0.6", status: "需关注" },
    ],
    sourceLabel: "日常评价记录模拟数据",
    comparableScope: "统一评价频率和量表后支持区域比较",
  },
];

export const topicDefinitionByKey = new Map(topicDefinitions.map((topic) => [topic.key, topic]));
