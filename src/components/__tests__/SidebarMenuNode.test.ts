import { describe, expect, it } from "vitest";
import { mount, RouterLinkStub } from "@vue/test-utils";
import SidebarMenuNode from "@/components/SidebarMenuNode.vue";
import type { MenuTreeNode } from "@/features/menu-config/types";

function node(
  id: string,
  name: string,
  children: MenuTreeNode[] = [],
): MenuTreeNode {
  return {
    id,
    tenantId: "tenant-a",
    parentId: null,
    type: children.length ? "directory" : "page",
    name,
    icon: null,
    pageKey: children.length ? null : "developing-placeholder",
    externalUrl: null,
    externalOpenMode: null,
    sort: 10,
    visible: true,
    children,
  };
}

describe("SidebarMenuNode", () => {
  it("does not color an expanded branch as active when no descendant is selected", () => {
    const item = node("parent", "父级菜单", [node("child", "子菜单")]);

    const wrapper = mount(SidebarMenuNode, {
      props: {
        item,
        activeKey: "",
        expandedKeys: ["parent"],
      },
    });

    expect(wrapper.find(".menu-button").classes()).not.toContain("is-branch-active");
  });

  it("colors a branch as active when a descendant menu is selected", () => {
    const item = node("parent", "父级菜单", [node("child", "子菜单")]);

    const wrapper = mount(SidebarMenuNode, {
      props: {
        item,
        activeKey: "child",
        expandedKeys: ["parent"],
      },
    });

    expect(wrapper.find(".menu-button").classes()).toContain("is-branch-active");
  });

  it("renders standalone internal pages as tenant-scoped new-tab router links", () => {
    const item = {
      ...node("overview", "区域教育总览"),
      pageKey: "bureau-regional-education-overview",
    };

    const wrapper = mount(SidebarMenuNode, {
      props: {
        item,
        tenantId: "bureau-001",
        activeKey: "",
        expandedKeys: [],
      },
      global: {
        stubs: { RouterLink: RouterLinkStub },
      },
    });

    const link = wrapper.findComponent(RouterLinkStub);
    expect(link.props("to")).toEqual({
      path: "/bureau/visualization/regional-education-overview",
      query: { tenantId: "bureau-001" },
    });
    expect(link.attributes("target")).toBe("_blank");
    expect(link.attributes("rel")).toBe("noopener noreferrer");
  });
});
