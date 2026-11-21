import { PageHeader } from "../components/PageHeader";
import { Icon } from "../shell/icons";
import type { IconName } from "../shell/icons";
import { useToast } from "../shell/Toast";

interface PluginInfo {
  name: string;
  icon: IconName;
  contributes: string[];
  about: string;
  /** null when enabled; otherwise when it arrives. */
  later: string | null;
}

/**
 * TEMPORARY: a fixed list written into the app. The plugin registry
 * (ADR-0006, step 2) replaces it with the plugins actually loaded; until
 * then this page only describes what is built in and what is coming.
 */
const PLUGINS: PluginInfo[] = [
  {
    name: "Paper Wiki",
    icon: "book",
    contributes: ["Page · Paper wiki"],
    about: "Shared paper notes, topics, concepts, and sources from paper-wiki/, in the graph and timeline viewer, on its own origin.",
    later: null,
  },
  {
    name: "Code view",
    icon: "file",
    contributes: ["Project view · Code"],
    about: "Shows a project's files and its Git changes, read-only.",
    later: "later in step 1",
  },
  {
    name: "Paper view",
    icon: "projects",
    contributes: ["Project view · Paper"],
    about: "Renders the project's paper from paper/main.tex, read-only.",
    later: "later in step 1",
  },
  {
    name: "Idea view",
    icon: "spark",
    contributes: ["Project view · Idea"],
    about: "A graph of questions, hypotheses, experiments, results, and claims, stored as one Markdown file per project.",
    later: "step 2",
  },
  {
    name: "Skeleton view",
    icon: "quote",
    contributes: ["Project view · Skeleton"],
    about: "The paper's claims, sources, and figures from paper_skeleton.md, each traced to its evidence.",
    later: "step 2",
  },
  {
    name: "Assets view",
    icon: "folder",
    contributes: ["Project view · Assets"],
    about: "Figures, tables, and baseline material from Figs/ and Baselines/.",
    later: "step 2",
  },
  {
    name: "Skills Hub",
    icon: "puzzle",
    contributes: ["Page · Skills", "Skills"],
    about: "Browse the research skills hub and install skills where you ask. The Skills page works today, built into the app; it moves into this plugin in step 2.",
    later: "step 2",
  },
];

/** Plugins (mockup C): what is enabled, and what is not available yet. */
export function PluginsPage() {
  const toast = useToast();
  const enabled = PLUGINS.filter((p) => p.later === null);
  const coming = PLUGINS.filter((p) => p.later !== null);
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

      <h2 className="mb-3 mt-[30px] flex items-center gap-2.5 font-serif text-[19px] font-medium">Bundled · not yet available</h2>
      <div className="grid grid-cols-2 gap-4">
        {coming.map((p) => (
          <PluginCard key={p.name} plugin={p} />
        ))}
      </div>
      <p className="src-note mt-4">This list is written into the app until the plugin registry arrives in step 2.</p>
    </div>
  );
}

function PluginCard({ plugin }: { plugin: PluginInfo }) {
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
