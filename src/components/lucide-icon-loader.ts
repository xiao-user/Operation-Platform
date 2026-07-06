import type { Component } from "vue";

type IconModule = { default: Component };

const dynamicIconModules = import.meta.glob<IconModule>(
  "../../node_modules/@lucide/vue/dist/esm/icons/*.mjs",
);

function iconKeyFromModulePath(path: string) {
  const pathSegments = path.split("/");
  const slug = pathSegments[pathSegments.length - 1]?.replace(/\.mjs$/, "") ?? "";
  return slug
    .split("-")
    .map((part) => {
      if (part.length === 1) return part.toUpperCase();
      if (/^\d+[a-z]$/.test(part)) {
        return `${part.slice(0, -1)}${part.charAt(part.length - 1).toUpperCase()}`;
      }
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`;
    })
    .join("");
}

function comparableIconKey(value: string) {
  return value.replace(/[^a-z0-9]/gi, "").toLocaleLowerCase("en-US");
}

const dynamicIconLoaders = new Map<string, () => Promise<IconModule>>(
  Object.entries(dynamicIconModules).map(([path, loader]) => [
    comparableIconKey(iconKeyFromModulePath(path)),
    loader,
  ]),
);

export const availableLucideIconKeys = Object.keys(dynamicIconModules).map(iconKeyFromModulePath);

export async function loadLucideIcon(iconKey: string) {
  const loader = dynamicIconLoaders.get(comparableIconKey(iconKey));
  return loader ? (await loader()).default : null;
}
