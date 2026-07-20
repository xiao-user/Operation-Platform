export const APPLICATION_TITLE = "智慧校园运营管理平台";

export interface DocumentTitleContext {
  authInitialized: boolean;
  authenticated: boolean;
  routeTitle?: string;
  navigationTitle?: string;
  tenantName?: string;
}

function normalizedTitle(value: string | undefined) {
  return value?.trim() ?? "";
}

export function resolveDocumentTitle(context: DocumentTitleContext) {
  if (!context.authInitialized) return APPLICATION_TITLE;

  if (!context.authenticated) {
    return "登录";
  }

  const pageTitle = normalizedTitle(context.navigationTitle) ||
    normalizedTitle(context.routeTitle);
  const tenantName = normalizedTitle(context.tenantName);
  const contextualParts = [pageTitle, tenantName]
    .filter((value, index, values) => value && values.indexOf(value) === index);

  return contextualParts.join(" - ") || APPLICATION_TITLE;
}
