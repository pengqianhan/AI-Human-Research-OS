import type { OsState } from "../types";
import { PageHeader } from "../components/PageHeader";
import { ProjectCard, UnregisteredCard } from "../components/ProjectCard";
import { RootAgentBar } from "../components/RootAgentBar";
import { WorkspaceStatus } from "../components/WorkspaceStatus";
import { useDesktopInfo } from "../components/DesktopStatus";
import { projectRows } from "../lib/projects";

interface Props {
  state: OsState;
  conversationOpen: boolean;
  onConversationOpenChange: (open: boolean) => void;
  onOpenProject: (name: string) => void;
}

function folderName(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.split(/[\\/]/).filter(Boolean).pop() ?? null;
}

/**
 * Home (mockup C): the root agent on top, one card per project from the real
 * snapshot below it, and the rest of the old Dashboard in a closed
 * "Workspace status" disclosure at the bottom.
 */
export function HomePage({ state, conversationOpen, onConversationOpenChange, onOpenProject }: Props) {
  const [info] = useDesktopInfo();
  const folder = folderName(info?.workspace);
  const rows = projectRows(state);
  const registered = rows.filter((r) => r.project !== null).length;
  const unregistered = state.unregistered_projects.length;

  return (
    <div className="page">
      <PageHeader
        eyebrow={folder ? `Workspace · ${folder}` : "Workspace"}
        title="Home"
        lede="One root agent moves every project forward. Each project below opens its own workspace, with its own conversation and views."
      />

      <RootAgentBar open={conversationOpen} onOpenChange={onConversationOpenChange} />

      <section aria-labelledby="home-projects">
        <div className="mb-4 flex items-baseline gap-3">
          <h2 id="home-projects" className="font-serif text-[22px] font-medium">
            Projects
          </h2>
          <span className="text-[13px] text-muted">
            {registered} registered
            {unregistered > 0 ? ` · ${unregistered} unregistered` : ""}
            <span className="section-src">memory/MEMORY.md · PROJECT_MEMORY.md</span>
          </span>
        </div>
        {rows.length === 0 && unregistered === 0 ? (
          <p className="card-flat px-6 py-5 font-serif text-[15px] text-ink2">
            No projects yet. A project appears here once it has a folder under <code>projects-folder/</code> and a row in the
            portfolio table of <code>memory/MEMORY.md</code>.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-[22px]">
            {rows.map((row) => (
              <ProjectCard key={row.name} row={row} onOpen={() => onOpenProject(row.name)} />
            ))}
            {state.unregistered_projects.map((entry) => (
              <UnregisteredCard key={entry.name} entry={entry} />
            ))}
          </div>
        )}
      </section>

      <WorkspaceStatus state={state} />
    </div>
  );
}
