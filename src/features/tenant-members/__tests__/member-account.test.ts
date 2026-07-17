import { describe, expect, it } from "vitest";
import { normalizeMemberAccount } from "@/features/tenant-members/member-account";

describe("member account", () => {
  it("normalizes Supabase login emails", () => {
    expect(normalizeMemberAccount(" LuoWuHang@Example.COM ", "email"))
      .toBe("luowuhang@example.com");
  });

  it("rejects non-email identifiers for authenticated persistence", () => {
    expect(() => normalizeMemberAccount("user-demo", "email"))
      .toThrow("请输入有效的登录邮箱");
  });

  it("keeps local demo identifiers available", () => {
    expect(normalizeMemberAccount(" user-demo ", "identifier")).toBe("user-demo");
  });
});
