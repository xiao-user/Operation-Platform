export type MemberAccountKind = "identifier" | "email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeMemberAccount(value: string, kind: MemberAccountKind) {
  const account = value.trim();
  if (!account) {
    throw new Error(kind === "email" ? "请输入登录邮箱" : "请输入成员账号");
  }
  if (kind === "email" && !EMAIL_PATTERN.test(account)) {
    throw new Error("请输入有效的登录邮箱");
  }
  return kind === "email" ? account.toLowerCase() : account;
}
