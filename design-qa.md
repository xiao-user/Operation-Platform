# Workbench Design QA

- source visual truth: `/var/folders/l9/bm97cgp13bv5rj46q3pyjrpw0000gn/T/codex-clipboard-d7ad9640-09bb-47d7-8e40-efbab188ab45.png`
- implementation URL: `http://127.0.0.1:4173/workbench`
- current screenshot: `output/design-qa/workbench-bureau-interactive.png`
- tested viewports: 1280 x 720, 1100 x 900, 390 x 844
- state: local persistence mode, education bureau business profile, populated typed mock data

**Design Direction**

- The reference's restrained white surface, light borders, compact typography, blue functional accents, and low-decoration portal density remain the visual baseline.
- The workbench prioritizes bureau work in this order: personal action metrics, calendar and task processing, role-filtered applications, then news, disclosure, analytics, learning, subscriptions, and announcements.
- Informational metrics remain read-only. Controls appear only where they change a date, filter, task state, subscription, or visible detail.

**Interaction Verification**

- Element Calendar supports month navigation, date selection, event markers, and selected-day agenda filtering.
- Calendar events can be created, edited, completed, restored, and deleted with Element form, dialog, checkbox, and confirmation feedback.
- Task center filters pending/completed/all items and moves completed work between states.
- News, disclosure, and announcement tabs filter content; selecting a row opens its real detail drawer and clears the unread marker.
- Ranking period controls recalculate values; growth period controls update score/progress; subscription switches update state with feedback.
- Quick applications remain real RBAC-filtered router or external links.

**Responsive Verification**

- At 1100px, metric cards pair without gaps; the calendar, task center, and quick applications use full-width rows.
- At 390px, every widget uses one column. The calendar stacks above the selected-day agenda without internal scrolling.
- Browser measurements found no document horizontal overflow and no widget horizontal overflow at either responsive viewport.

**Comparison Findings**

- The implementation matches the reference's visual restraint while replacing the reference's generic portal content with bureau-specific operational work.
- No promotional banner or account card was copied because those surfaces do not serve the education bureau's workbench tasks.
- No actionable P0, P1, or P2 visual findings remain.

**Verification**

- `npm run check`: passed, 54 test files and 269 tests.
- `npm run test:e2e -- e2e/workbench.spec.ts`: passed, 9 Chromium scenarios.
- Browser interaction pass: passed for calendar CRUD, task status, feed detail, ranking filter, subscription toggle, and desktop/mobile layout.

final result: passed

---

# 学生成长画像设计 QA

- 最终结果：passed
- 验证日期：2026-07-21
- 验证环境：本地演示数据，体验区教育局管理员，Chromium in-app browser
- 桌面视口：1440 × 1024
- 响应式视口：1024 × 768

## 视觉来源

- `/Users/liuxiao/.codex/generated_images/019f761f-0033-7731-bcfa-8296717059a4/exec-cbfad007-5358-4503-8b74-403d97143e54.png`
- `/Users/liuxiao/.codex/generated_images/019f761f-0033-7731-bcfa-8296717059a4/exec-a852142c-34be-410f-a65e-d668a640387d.png`
- `/Users/liuxiao/.codex/generated_images/019f761f-0033-7731-bcfa-8296717059a4/exec-25d1f890-3626-4a91-8c14-f77f6a60da69.png`

## 实现截图

- `/private/tmp/student-growth-portrait-overview-final.png`
- `/private/tmp/student-growth-portrait-schools-final.png`
- `/private/tmp/student-growth-portrait-trends-final.png`
- `/private/tmp/student-growth-portrait-1024-fixed2.png`

## 同屏对照证据

- `/private/tmp/student-growth-portrait-compare-overview.png`
- `/private/tmp/student-growth-portrait-compare-schools.png`
- `/private/tmp/student-growth-portrait-compare-trends.png`

## 检查结论

- 信息层级与参考方向一致：筛选、专题导航、核心判读、图表或表格、治理建议依次展开。
- 延续现有 SaaS Shell、Element Plus 与设计变量，没有引入新的视觉体系。
- 总览、学校差异、学校详情抽屉、趋势跟进、全部专题和查询反馈均可交互。
- 心理健康保持明确占位，不生成模拟风险人数、诊断结论或学生标签。
- 1024px 视口初检发现专题三栏受 Shell 可用宽度影响产生裁切；已将指标区和专题主区在 1180px 下换行，并复检通过。
- 学校对比表在桌面视口完整显示，窄屏保留 Element Plus 表格的内部滚动语义。

## 对照历史

1. 第一轮：完成总览、学校差异、趋势跟进与三张视觉参考的同屏比较。
2. 第二轮：修复窄屏专题内容裁切与指标卡空白列问题。
3. 最终轮：重新采集桌面与窄屏截图，交互与视觉层级通过。

## 验证

- `npm run check`：通过，68 个测试文件、318 个测试全部通过，生产构建成功。
- 最终页面刷新后新增浏览器 warning/error：0。
- 目标路由、动态标题、菜单高亮和管理员权限链路：通过。

## SaaS 结构收敛复检

- 对照实现：`src/views/bureau/custody/org/OrgReviewView.vue` 与 `src/components/PageFilterBar.vue`。
- 页面根节点已由 `main` 改为普通容器，移除面包屑、页面标题、模拟数据标签和更新时间。
- 查询区直接复用 `PageFilterBar`，字段采用行内标签、固定控件宽度和自动换行。
- 十个专题全部使用单层 `ElMenu` 展示，取消 Tabs、Dropdown 和“更多”分支。
- 专题导航与内容改为 168px / 自适应左右布局；1024px 下导航收窄，内容模块自然单列。
- 业务模块取消外围描边并统一使用 `--radius-md`（4px）；保留表格和列表内部必要分隔线。
- 桌面截图：`/private/tmp/student-growth-portrait-saas-redesign-final.png`。
- 学校差异截图：`/private/tmp/student-growth-portrait-saas-schools-final.png`。
- 1024px 截图：`/private/tmp/student-growth-portrait-saas-1024-final.png`。
- 复检中修复了区域总览按钮溢出、窄屏图表标题挤压及学校基准指标拆行。

final result: passed
