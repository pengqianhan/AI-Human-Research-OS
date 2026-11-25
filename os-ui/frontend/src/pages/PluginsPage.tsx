import { PageHeader } from "../components/PageHeader";
import type { Slot } from "../plugins/pages";
import { pluginIcon, usePlugins } from "../plugins/registry";
import { Icon } from "../shell/icons";
import type { IconName } from "../shell/icons";
import { useToast } from "../shell/Toast";

/** One plugin's card. */
interface Card {
  name: string;
  icon: IconName;
  contributes: string[];
  about: string;
  /** null when enabled; otherwise when it arrives. */
  later: string | null;
}

/** How a card names a page a plugin contributes, by where the page shows. */
const SLOT_LABEL: Record<Slot, string> = { nav: "Page", home: "Home panel", project: "Project view" };

/**
 * The plan: the bundled plugins not built yet, written into the app. The
 * enabled ones are not listed here; they are read from the plugin registry
 * (src/plugins/registry.ts). Remove a plugin from this list when its
 * manifest is bundled; with none left, the page shows no such section.
 * Skills Hub, the last, was bundled in step 2.5.
 */
const PLANNED: Card[] = [];

/** Plugins (mockup C): the bundled plugins that are loaded, and any not available yet. */
export function PluginsPage() {
  const toast = useToast();
  const { plugins, pages } = usePlugins();
  const enabled: Card[] = plugins
    .filter((p) => p.source === "bundled")
    .map((p) => ({
      name: p.name,
      icon: pluginIcon(p.id),
      contributes: pages.filter((page) => page.plugin === p.id).map((page) => `${SLOT_LABEL[page.slot]} · ${page.title}`),
      about: p.description,
      later: null,
    }));
  return (
    <div className="page">
      <PageHeader
        eyebrow="Extensions"
        title="Plugins"
        lede="The trunk stays small. Pages, project views, and skills come from plugins; bundled plugins use the same contract as the ones you write."
        right={
          <button
            type="button"
            className="btn"
            aria-disabled="true"
            onClick={() => toast("Loading a plugin from a local folder arrives in step 2.")}
            title="Loading a plugin from a local folder arrives in step 2."
          >
            <Icon name="folder-open" size={14} />
            Load from folder
            <span className="step-badge">step 2</span>
          </button>
        }
      />

      <h2 className="mb-3 mt-[30px] flex items-center gap-2.5 font-serif text-[19px] font-medium">Bundled · enabled</h2>
      <div className="grid grid-cols-2 gap-4">
        {enabled.map((p) => (
          <PluginCard key={p.name} plugin={p} />
        ))}
      </div>

      {PLANNED.length > 0 && (
        <>
          <h2 className="mb-3 mt-[30px] flex items-center gap-2.5 font-serif text-[19px] font-medium">Bundled · not yet available</h2>
          <div className="grid grid-cols-2 gap-4">
            {PLANNED.map((p) => (
              <PluginCard key={p.name} plugin={p} />
            ))}
          </div>
        </>
      )}
      <p className="src-note mt-4">
        {PLANNED.length > 0
          ? "The enabled list is read from the plugins themselves; the rest is the plan, written into the app."
          : "The enabled list is read from the plugins themselves."}
      </p>
    </div>
  );
}

function PluginCard({ plugin }: { plugin: Card }) {
  const later = plugin.later !== null;
  return (
    <article className={"flex gap-3.5 rounded-card px-5 py-[18px] " + (later ? "bg-paper shadow-sh1" : "card")}>
      <span className={"grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[10px] " + (later ? "bg-mute-soft text-faint" : "bg-accent-tint text-accent")}>
        <Icon name={plugin.icon} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className={"mb-[3px] flex flex-wrap items-center gap-2 font-serif text-[17px] font-medium " + (later ? "text-muted" : "")}>
          {plugin.name}
          {later ? <span className="step-badge">{plugin.later}</span> : <span className="pill">Enabled</span>}
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {plugin.contributes.map((c) => (
            <span key={c} className="rounded-full bg-mute-soft px-2 py-[2px] text-[11.5px] text-ink2">
              {c}
            </span>
          ))}
        </div>
        <p className={"mt-1.5 font-serif text-[14px] leading-normal " + (later ? "text-muted" : "text-ink2")}>{plugin.about}</p>
      </div>
    </article>
  );
}
