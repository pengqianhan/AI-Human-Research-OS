import type {
  InstallForm,
  OrphanSkill,
  SkillInstall,
  Store,
  StoreSkill,
  SyncStatus,
} from "../types";

/** Unified shape used to render both hub-collection skills and orphans. */
export interface DisplaySkill {
  name: string;
  description: string;
  /** Collection name, or "no hub source" for orphans. */
  collection: string;
  license: string | null;
  hasScripts: boolean;
  sync: SyncStatus;
  installForm: InstallForm | null;
  installs: SkillInstall[];
}

export const ORPHAN_COLLECTION_LABEL = "no hub source";

function fromStoreSkill(collection: string, s: StoreSkill): DisplaySkill {
  return {
    name: s.name,
    description: s.description,
    collection,
    license: s.license,
    hasScripts: s.has_scripts,
    sync: s.sync,
    installForm: s.install_form ?? null,
    installs: s.installs ?? [],
  };
}

function fromOrphanSkill(s: OrphanSkill): DisplaySkill {
  return {
    name: s.name,
    description: s.description,
    collection: ORPHAN_COLLECTION_LABEL,
    license: null,
    hasScripts: false,
    sync: s.sync,
    installForm: null,
    installs: s.installs ?? [],
  };
}

/** Flatten store.collections + store.orphans into one list for the Store page. */
export function flattenStore(store: Store): DisplaySkill[] {
  const fromCollections = store.collections.flatMap((c) =>
    c.skills.map((s) => fromStoreSkill(c.name, s)),
  );
  const fromOrphans = store.orphans.map(fromOrphanSkill);
  return [...fromCollections, ...fromOrphans];
}

/** Real install command for a skill, per DESIGN.md §3 — always carries --collection. */
const INSTALLER_PATH =
  "research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py";

export function installCommand(skill: DisplaySkill): string {
  if (skill.sync === "installed_no_hub_source") {
    // There is no sync-back command any more (ADR 0002): a symlinked install
    // is the hub, and copied installs come from an auto-refreshed mirror that
    // ADR 0001 forbids editing. An orphan is inspected, not promoted.
    return `python ${INSTALLER_PATH} status ${skill.name}`;
  }
  return `python ${INSTALLER_PATH} install ${skill.name} --collection ${skill.collection}`;
}

export function copyButtonLabel(skill: DisplaySkill): string {
  return skill.sync === "installed_no_hub_source" ? "Copy status command" : "Copy install command";
}

/** Command that installs this skill at one specific target. */
export function installAtTargetCommand(skill: DisplaySkill, target: string): string {
  return (
    `python ${INSTALLER_PATH} install ${skill.name} ` +
    `--collection ${skill.collection} --target ${target}`
  );
}
