import type { RouteLocationNormalizedLoaded } from "vue-router";
import type { TenantInfo } from "@/types/user";

const MAX_PAGE_TEXT_LENGTH = 6000;
const MAX_HEADINGS = 12;
const PAGE_CONTEXT_REFERENCE = /当前页面|本页|这个页面|该页面|页面上|页面中|当前数据|这些数据|上述数据|当前图表|这个图表|当前列表|列表中|当前看板|这里的/;

export interface AssistantPageContext {
  schemaVersion: 1;
  collectedAt: string;
  route: {
    path: string;
    name: string;
  };
  tenant: Pick<TenantInfo, "id" | "name" | "type">;
  navigation: {
    module: string;
    trail: string[];
  };
  page: {
    title: string;
    headings: string[];
    text: string;
    structuredData: Record<string, unknown> | null;
    source: "provider" | "page";
  };
}

export interface AssistantPageContextProvider {
  id: string;
  priority?: number;
  matches: (route: RouteLocationNormalizedLoaded) => boolean;
  collect: () => Record<string, unknown> | Promise<Record<string, unknown>>;
}

interface CollectPageContextOptions {
  route: RouteLocationNormalizedLoaded;
  tenant: TenantInfo;
  moduleName: string;
  navigationTrail: string[];
  rootElement?: HTMLElement | null;
}

const providers = new Map<string, AssistantPageContextProvider>();

export function registerAssistantPageContextProvider(provider: AssistantPageContextProvider) {
  providers.set(provider.id, provider);
  return () => {
    if (providers.get(provider.id) === provider) providers.delete(provider.id);
  };
}

export function shouldIncludeAssistantPageContext(
  content: string,
  capability: string | null,
  pageTitle?: string,
) {
  return Boolean(capability?.trim())
    || PAGE_CONTEXT_REFERENCE.test(content)
    || Boolean(pageTitle?.trim() && content.includes(pageTitle.trim()));
}

export async function collectAssistantPageContext(
  options: CollectPageContextOptions,
): Promise<AssistantPageContext> {
  const provider = [...providers.values()]
    .sort((first, second) => (first.priority ?? 100) - (second.priority ?? 100))
    .find((candidate) => candidate.matches(options.route));
  const structuredData = provider ? await provider.collect() : null;
  const root = options.rootElement ?? document.querySelector<HTMLElement>(".app-content-inner");
  const headings = collectHeadings(root);
  const routeTitle = typeof options.route.meta.title === "string" ? options.route.meta.title : "";
  const title = routeTitle || headings[0]
    || options.navigationTrail[options.navigationTrail.length - 1]
    || document.title;

  return {
    schemaVersion: 1,
    collectedAt: new Date().toISOString(),
    route: {
      path: options.route.path,
      name: typeof options.route.name === "string" ? options.route.name : "",
    },
    tenant: {
      id: options.tenant.id,
      name: options.tenant.name,
      type: options.tenant.type,
    },
    navigation: {
      module: options.moduleName,
      trail: [...options.navigationTrail],
    },
    page: {
      title,
      headings,
      text: collectPageText(root),
      structuredData,
      source: provider ? "provider" : "page",
    },
  };
}

function collectHeadings(root: HTMLElement | null) {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>("h1, h2, h3, [role='heading']")]
    .map((element) => normalizeText(element.textContent ?? ""))
    .filter((text, index, values) => Boolean(text) && values.indexOf(text) === index)
    .slice(0, MAX_HEADINGS);
}

function collectPageText(root: HTMLElement | null) {
  if (!root) return "";
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll([
    "script",
    "style",
    "input",
    "textarea",
    "select",
    "button",
    "[aria-hidden='true']",
    ".el-skeleton",
    ".ui-resizable-handle",
  ].join(", ")).forEach((element) => element.remove());
  return normalizeText(clone.textContent ?? "").slice(0, MAX_PAGE_TEXT_LENGTH);
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}
