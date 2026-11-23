/**
 * The plugins compiled into os-ui, one folder each beside this file
 * (`<id>/plugin.json`; site-kit.ts beside them is the code their sites share).
 * Pure, so the renderer can read it too. The list order is the menu and tab
 * order.
 */
export const BUNDLED_IDS = ["paper-wiki", "code-view", "paper-view", "skeleton-view"] as const;
