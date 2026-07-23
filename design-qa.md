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

# 智慧体育 HUD 设计 QA

- 视觉来源：`/private/tmp/figma-smart-sports-reference.png`
- 仪表盘细节来源：`/var/folders/l9/bm97cgp13bv5rj46q3pyjrpw0000gn/T/codex-clipboard-4d683d96-370b-4ab8-8f10-439cdf9253a2.png`
- 排名序号素材：`/Users/liuxiao/Desktop/img/2/03.svg`
- 底部卡片节点：`8251:30525`（1490 × 160）
- 实现截图：`.playwright-cli/page-2026-07-23T01-47-07-789Z.png`
- 实现路由：`http://127.0.0.1:5175/bureau/ai-precision-teaching/smart-sports/cockpit?tenantId=bureau-001`
- 验证视口：1920 × 1080

## 同屏对照结论

- 顶部产品标题、天气、时间、用户区与区域大屏保持一致；智慧体育恢复五组地图主题选择，只隐藏教育驾驶舱主菜单。
- 左侧数据层级、字号与 D-DIN 数字字族契约匹配；核心总人数维持 700 字重，其余数字使用 28px / 400。
- 底部三卡严格使用 `360px / 360px / fill`、24px 列间距和 160px 高度；卡片内边距 16px、内部间距 8px，边框为左上到右下渐变，右侧两卡使用指定的 173deg 透明渐变背景。
- 两个健康目标卡改为 ECharts 双层 Progress Gauge，包含细外环、圆角进度、0/55/100 刻度、中心百分比与完成数据。
- 排名序号使用提供的固定橙色 SVG，不再随地图主题变化；趋势卡移除标题，仅保留可横向滚动的指标切换。
- HUD 外层继续穿透指针事件；浏览器确认地图核心交互目标仍为 `CANVAS.regional-map-canvas`。
- 体育模式下，学校搜索与地图控制条位于底部卡片上方 16px；AI 数据助手位于相同安全带右侧，并改用容器坐标的绝对定位拖拽，拖动过程无跳位。

## 对照历史

1. 第一轮：恢复共享顶部系统区，并移除智慧体育分支对主题与用户控件的条件隐藏。
2. 第二轮：统一卡片渐变描边、16px 内边距、分段进度色、排名素材和双层仪表盘。
3. 第三轮：按 Figma 节点 `8251:30525` 将底部卡片由 216px 收敛到 160px，并恢复固定 360px 仪表卡与 fill 趋势卡。
4. 最终轮：在 1920 × 1080 将 Figma 节点截图与实现截图同批对照，实测地图控制条、学校搜索、AI 助手均与三卡保持 16px 安全间距，AI 拖拽坐标连续。

## 验证

- `npm run check`：通过，76 个测试文件、382 个测试全部通过，生产构建成功。
- `npm run test:e2e -- e2e/app-shell.spec.ts --grep '智慧体育数据驾驶舱'`：通过。
- Chromium 视觉与交互复检：通过；主题切换、排行榜模式、全局数据 Tab 与地图 Canvas 交互均正常。

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
