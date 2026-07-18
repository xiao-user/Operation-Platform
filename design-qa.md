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
