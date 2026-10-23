import { getPackages } from "@/lib/catalog";
import { buildMenu } from "@/lib/menu";
import { Header } from "./header";

/** Loads the menu (from the cached package list) and renders the header. */
export async function SiteHeader() {
  return <Header menu={buildMenu(await getPackages())} />;
}
