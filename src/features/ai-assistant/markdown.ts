import MarkdownIt from "markdown-it";
import { katex } from "@mdit/plugin-katex";

const markdown = new MarkdownIt({
  breaks: true,
  html: false,
  linkify: true,
  typographer: true,
}).use(katex, {
  throwOnError: false,
});

const defaultLinkOpen = markdown.renderer.rules.link_open
  ?? ((tokens, index, options, _environment, renderer) => renderer.renderToken(tokens, index, options));

markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  const token = tokens[index];
  token?.attrSet("target", "_blank");
  token?.attrSet("rel", "noopener noreferrer");
  return defaultLinkOpen(tokens, index, options, environment, renderer);
};

markdown.renderer.rules.table_open = () => '<div class="table-wrapper"><table>\n';
markdown.renderer.rules.table_close = () => "</table></div>\n";

export function renderAssistantMarkdown(content: string) {
  return markdown.render(content);
}
