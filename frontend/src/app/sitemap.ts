import type { MetadataRoute } from "next";
import { getPackages } from "@/lib/catalog";
import { categories, packageHref } from "@/lib/packages";
import { site } from "@/lib/site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const packages = await getPackages();
  const pages = ["", "/packages", "/custom-package", "/about", "/contact", "/terms", "/privacy-policy"];
  return [
    ...pages.map((path) => ({ url: `${site.url}${path}`, priority: path === "" ? 1 : 0.6 })),
    ...categories.map((c) => ({
      url: `${site.url}/packages/${c.slug}`,
      priority: c.group === "main" ? 0.9 : 0.7,
    })),
    ...packages.map((p) => ({ url: `${site.url}${packageHref(p)}`, priority: 0.8 })),
  ];
}
