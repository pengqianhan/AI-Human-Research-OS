import { useState } from "react";
import type { SkillInstall, StoreTarget } from "../types";
import type { DisplaySkill } from "../lib/skills";
import { installAtTargetCommand } from "../lib/skills";

interface Props {
  skill: DisplaySkill;
  targets: StoreTarget[];
}

const SCOPE_ORDER = ["repo", "global", "project"] as const;

/**
 * Where this skill is installed, grouped by scope, with the one write action
 * os-ui is authorized to perform: disable or enable a single location
 * (GOAL.md M4, 2026-07-22).
 *
 * Targets with no install are listed too, greyed out, so the drawer answers
 * "where else could this go?" without a trip to the terminal. Installing there
 * is still a copied command — only the toggle writes.
 *
 * There is no optimistic update. A toggled row shows "working..." until the
 * 5s poll brings the regenerated snapshot, because DESIGN.md §5 prefers
 * honest stale state over invented realtime.
 */
export function SkillInstalls({ skill, targets }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (targets.length === 0) {
    return (
      <p className="text-[11.5px] text-stale">
        Install locations are unavailable: the generator could not load
        research-skill-installer.
      </p>
    );
  }

  const byTarget = new Map<string, SkillInstall>(skill.installs.map((i) => [i.target, i]));
  const installedCount = skill.installs.length;

  async function toggle(target: string, enable: boolean) {
    setBusy(target);
    setError(null);
    try {
      const res = await fetch("/api/skill/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: skill.name, collection: skill.collection, target, enable }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) setError(body.error ?? "toggle failed");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  async function copyCommand(target: string) {
    try {
      await navigator.clipboard.writeText(installAtTargetCommand(skill, target));
      setCopied(target);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setError("clipboard unavailable - copy the command manually");
    }
  }

  return (
    <div className="mt-1">
      <div className="font-mono-heading mb-2 flex items-baseline justify-between text-[11px] text-stale">
        <span>{skill.installForm ? `${skill.installForm} → hub` : "form unknown"}</span>
        <span>
          {installedCount} of {targets.length} installed
        </span>
      </div>

      {SCOPE_ORDER.map((scope) => {
        const rows = targets.filter((t) => t.scope === scope);
        if (rows.length === 0) return null;
        return (
          <div key={scope} className="mb-2.5">
            <div className="font-mono-heading text-[10px] uppercase tracking-[.05em] text-stale">
              {scope}
            </div>
            {rows.map((target) => {
              const install = byTarget.get(target.name);
              const working = busy === target.name;
              return (
                <div
                  key={target.name}
                  className="flex items-center gap-2 border-b border-grid py-1 last:border-b-0"
                >
                  <span
                    aria-hidden="true"
                    className={
                      "inline-block h-[7px] w-[7px] shrink-0 rounded-full " +
                      (!install
                        ? "border border-grid"
                        : install.ok
                          ? "bg-ink"
                          : "bg-warn")
                    }
                  />
                  <span className="font-mono-heading min-w-0 flex-1 truncate text-[11.5px]">
                    {target.name}
                    <span className="ml-1.5 text-stale">
                      {target.display_path ?? target.path}
                    </span>
                  </span>

                  {install ? (
                    <button
                      type="button"
                      disabled={working}
                      aria-pressed={!install.disabled}
                      onClick={() => void toggle(target.name, install.disabled)}
                      className="font-mono-heading shrink-0 rounded-[3px] border border-ink px-2 py-px text-[10.5px] hover:bg-ink hover:text-white disabled:opacity-50"
                    >
                      {working ? "working..." : install.disabled ? "enable" : "disable"}
                    </button>
                  ) : (
                    // No enable button here on purpose. For a symlinked skill,
                    // "enable where nothing is installed" would create the
                    // install — a GUI install button, which GOAL.md M4 does not
                    // authorize. Installing stays a copied command.
                    <button
                      type="button"
                      onClick={() => void copyCommand(target.name)}
                      className="font-mono-heading shrink-0 rounded-[3px] border border-grid px-2 py-px text-[10.5px] text-stale hover:border-ink"
                      title="Copy the install command for this target"
                    >
                      {copied === target.name ? "copied ✓" : "install ⧉"}
                    </button>
                  )}
                </div>
              );
            })}
            {rows.map((target) => {
              const install = byTarget.get(target.name);
              if (!install || install.ok) return null;
              return (
                <p key={`${target.name}-detail`} className="mt-0.5 text-[11px] text-warn">
                  {target.name}: {install.detail}
                </p>
              );
            })}
          </div>
        );
      })}

      {error && <p className="mt-1 text-[11px] text-warn">{error}</p>}
      <p className="mt-1 text-[11px] text-stale">
        Disable never deletes skill content: a linked install moves into the
        target's <code>.disabled/</code>, a copied one renames its SKILL.md.
        Installing somewhere new is still a copied command.
      </p>
    </div>
  );
}
