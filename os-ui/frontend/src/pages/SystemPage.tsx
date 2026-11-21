import type { ReactNode } from "react";
import { desktop } from "../lib/desktop";
import { Disclosure } from "../components/Disclosure";
import {
  ChooseFolderButton,
  PrerequisiteGrid,
  SnapshotLine,
  useDesktopInfo,
  usePrerequisites,
} from "../components/DesktopStatus";

function SettingCard({ title, text, children }: { title: string; text?: ReactNode; children: ReactNode }) {
  return (
    <section className="card mt-[18px] px-6 py-5">
      <h2 className="mb-1 flex items-center gap-2.5 font-serif text-[19px] font-medium">{title}</h2>
      {text && <p className="mb-3 mt-1 max-w-[66ch] font-serif text-[14.5px] leading-normal text-ink2">{text}</p>}
      {children}
    </section>
  );
}

/**
 * Desktop client only: which Research OS folder is open, whether the
 * snapshot generator ran, and whether uv, Python, Git, Claude Code, and Codex
 * are usable. Shown inside Settings; glance-first: chips and versions,
 * details on click. Renders nothing in a browser.
 */
export function SystemPage() {
  const [info] = useDesktopInfo();
  const [report, checking, recheck] = usePrerequisites();

  if (desktop === null) return null;

  return (
    <>
      <SettingCard title="Workspace folder" text={<>The folder this app opens. Projects live under <code>projects-folder/</code> inside it.</>}>
        <div className="flex flex-wrap items-center gap-2.5">
          <code
            data-testid="workspace"
            className="min-w-0 flex-1 truncate rounded-[9px] bg-paper px-3 py-[9px] text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--line)]"
            title={info?.workspace ?? ""}
          >
            {info?.workspace ?? "none"}
          </code>
          <ChooseFolderButton label="Change…" />
        </div>
        {info?.workspaceProblem && <p className="mt-2 text-[13px] text-danger">{info.workspaceProblem}</p>}
      </SettingCard>

      <SettingCard title="Snapshot" text="The data this app shows is read from the folder's files into one snapshot, refreshed when they change.">
        <div className="flex flex-wrap items-center gap-3">
          <span className="label">Last run</span>
          <SnapshotLine snapshot={info?.snapshot ?? null} />
        </div>
      </SettingCard>

      <SettingCard title="Prerequisites and logins" text="What this app needs on your machine, and which coding agents are signed in.">
        <PrerequisiteGrid report={report} checking={checking} onRecheck={recheck} />
      </SettingCard>

      {info && (
        <section className="card mt-[18px] px-6 py-4">
          <Disclosure summary={<span className="text-[13.5px] font-semibold text-ink">About this client</span>}>
            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 pl-5 text-[12.5px] text-ink2">
              <dt className="label !leading-[1.9]">Version</dt>
              <dd>{info.appVersion}</dd>
              <dt className="label !leading-[1.9]">Platform</dt>
              <dd>
                {info.platform}-{info.arch}
              </dd>
              <dt className="label !leading-[1.9]">Electron</dt>
              <dd>
                {info.versions.electron} (Chrome {info.versions.chrome}, Node {info.versions.node})
              </dd>
              <dt className="label !leading-[1.9]">Python</dt>
              <dd className="font-mono-heading break-all text-[12px]">{info.python}</dd>
              <dt className="label !leading-[1.9]">Environment</dt>
              <dd>{info.envSource}</dd>
            </dl>
          </Disclosure>
        </section>
      )}
    </>
  );
}
