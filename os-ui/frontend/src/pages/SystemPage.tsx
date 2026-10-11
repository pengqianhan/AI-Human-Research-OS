import { desktop } from "../lib/desktop";
import { Disclosure } from "../components/Disclosure";
import {
  ChooseFolderButton,
  PrerequisiteGrid,
  SnapshotLine,
  useDesktopInfo,
  usePrerequisites,
} from "../components/DesktopStatus";

/**
 * Desktop client only: which Research OS folder is open, whether the
 * snapshot generator ran, and whether uv, Python, Git, Claude Code, and Codex
 * are usable. Glance-first: chips and versions, details on click.
 */
export function SystemPage() {
  const [info] = useDesktopInfo();
  const [report, checking, recheck] = usePrerequisites();

  if (desktop === null) return null;

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap items-center gap-3">
        <h3 className="font-mono-heading w-full text-[11px] uppercase tracking-[.08em] text-stale">Folder</h3>
        <code data-testid="workspace" className="font-mono-heading min-w-0 flex-1 truncate text-[12.5px] text-ink" title={info?.workspace ?? ""}>
          {info?.workspace ?? "none"}
        </code>
        <ChooseFolderButton label="Change…" />
        {info?.workspaceProblem && <p className="w-full text-[12px] text-danger">{info.workspaceProblem}</p>}
      </section>

      <section className="flex flex-wrap items-center gap-3">
        <h3 className="font-mono-heading text-[11px] uppercase tracking-[.08em] text-stale">Snapshot</h3>
        <SnapshotLine snapshot={info?.snapshot ?? null} />
      </section>

      <PrerequisiteGrid report={report} checking={checking} onRecheck={recheck} />

      {info && (
        <Disclosure summary={<span className="font-mono-heading text-[11px] uppercase tracking-[.08em] text-stale">About this client</span>}>
          <dl className="font-mono-heading grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[11.5px] text-ink-soft">
            <dt>Version</dt>
            <dd>{info.appVersion}</dd>
            <dt>Platform</dt>
            <dd>
              {info.platform}-{info.arch}
            </dd>
            <dt>Electron</dt>
            <dd>
              {info.versions.electron} (Chrome {info.versions.chrome}, Node {info.versions.node})
            </dd>
            <dt>Python</dt>
            <dd className="break-all">{info.python}</dd>
            <dt>Environment</dt>
            <dd>{info.envSource}</dd>
          </dl>
        </Disclosure>
      )}
    </div>
  );
}
