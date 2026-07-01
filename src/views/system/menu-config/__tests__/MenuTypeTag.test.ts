import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import MenuTypeTag from "@/views/system/menu-config/MenuTypeTag.vue";

describe("MenuTypeTag", () => {
  function render(type: "module" | "directory" | "page" | "external", level: number) {
    return mount(MenuTypeTag, {
      props: { type, level },
      global: { plugins: [ElementPlus] },
    });
  }

  it("uses the four-level configuration vocabulary", () => {
    expect(render("module", 1).text()).toBe("一级模块");
    expect(render("directory", 2).text()).toBe("二级目录");
    expect(render("directory", 3).text()).toBe("三级目录");
    expect(render("page", 2).text()).toBe("四级页面");
    expect(render("external", 3).text()).toBe("四级外链");
  });
});
