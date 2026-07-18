import { describe, expect, it } from "vitest";
import { renderAssistantMarkdown } from "@/features/ai-assistant/markdown";

describe("assistant Markdown renderer", () => {
  it("renders common Markdown structures", () => {
    const html = renderAssistantMarkdown("## 分析\n\n- 第一项\n- **第二项**");
    expect(html).toContain("<h2>分析</h2>");
    expect(html).toContain("<ul>");
    expect(html).toContain("<strong>第二项</strong>");
  });

  it("renders inline and display formulas with KaTeX", () => {
    const html = renderAssistantMarkdown("行内 $a^2+b^2=c^2$\n\n$$\\sum_{i=1}^n i$$");
    expect(html).toContain("katex");
    expect(html).toContain("katex-display");
  });

  it("escapes raw HTML from model output", () => {
    const html = renderAssistantMarkdown('<script>alert("xss")</script>');
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("wraps tables so narrow sidebars can scroll them independently", () => {
    const html = renderAssistantMarkdown("| 指标 | 数值 |\n| --- | --- |\n| 到校率 | 98% |");
    expect(html).toContain('<div class="table-wrapper"><table>');
    expect(html).toContain("</table></div>");
  });
});
