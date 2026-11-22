import { usePlugins } from "../plugins/registry";
import { PluginFrame } from "./PluginScreen";

/**
 * The Paper Wiki window of the retired dock shell (src/desktop/apps.tsx),
 * which S8 deletes with this file. The layout shows the viewer through
 * PluginScreen; both take the frame URL from the plugin registry.
 */
export function PaperWikiPage() {
  const page = usePlugins().pages.find((p) => p.plugin === "paper-wiki" && p.slot === "nav");
  return <PluginFrame src={page?.src ?? null} title="Paper Wiki" />;
}
