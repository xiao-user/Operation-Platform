import type {
  AdministrativeBoundaryNode,
  AdministrativeBoundaryProvider,
} from "./administrative-map-data-source";
import {
  AdministrativeBoundaryUnavailableError,
  loadAdministrativeChildren,
} from "./administrative-boundary-service";

export function createPublicAdministrativeBoundaryProvider(
  canResolve: (node: AdministrativeBoundaryNode) => boolean,
): AdministrativeBoundaryProvider {
  return {
    async resolveChildren(node, context) {
      if (!canResolve(node)) return { status: "unsupported" };
      if (node.childrenHint === "unavailable") return { status: "unavailable" };
      try {
        const children = await loadAdministrativeChildren(node.code, context?.signal);
        return children.features.length > 0
          ? { status: "available", children }
          : { status: "unavailable" };
      } catch (error) {
        if (error instanceof AdministrativeBoundaryUnavailableError) {
          return { status: "unavailable" };
        }
        throw error;
      }
    },
  };
}
