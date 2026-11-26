import { PageHeader } from "../components/PageHeader";
import { DESKTOP, LIVE } from "../lib/mode";
import { SystemPage } from "./SystemPage";

/**
 * Settings (mockup C). In the desktop client: the folder, the snapshot, the
 * prerequisites and logins (SystemPage). In a browser those controls do not
 * exist, so it says where they are. Agent selection is step 4; mockup C's
 * Agents toggles are not drawn.
 */
export function SettingsPage() {
  return (
    <div className="page">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        lede="SuperResearch OS has no model of its own. It launches your own coding agent, on your own plan."
      />
      {DESKTOP ? (
        <SystemPage />
      ) : (
        <section className="card mt-[18px] px-6 py-5">
          <h2 className="mb-1 font-serif text-[19px] font-medium">In the desktop app</h2>
          <p className="max-w-[66ch] font-serif text-[14.5px] leading-normal text-ink2">
            The workspace folder, the snapshot generator, and the check of prerequisites and logins live in the desktop app
            (<code>os-ui/client</code>).{" "}
            {LIVE
              ? "In a browser, this page reads the checkout the dev server runs in; refresh the snapshot with the command at the bottom of the sidebar."
              : "This published copy is view only and is refreshed by its deploy."}
          </p>
        </section>
      )}
      <p className="mt-5 flex items-center gap-2 text-[13px] text-muted">
        <span className="step-badge">step 4</span>
        Agent selection arrives in step 4; until then each conversation picks Claude Code or Codex in its own header.
      </p>
    </div>
  );
}
