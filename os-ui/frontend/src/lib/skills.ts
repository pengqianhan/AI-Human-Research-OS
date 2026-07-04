import type { OrphanSkill, Store, StoreSkill, SyncStatus } from "../types";

/** Unified shape used to render both hub-collection skills and orphans. */
export interface DisplaySkill {
  name: string;
  description: string;
  /** Collection name, or "hub 无源" for orphans (no hub source). */
  collection: string;
  license: string | null;
  hasScripts: boolean;
  sync: SyncStatus;
}

export const ORPHAN_COLLECTION_LABEL = "hub 无源";

function fromStoreSkill(collection: string, s: StoreSkill): DisplaySkill {
  return {
    name: s.name,
    description: s.description,
    collection,
    license: s.license,
    hasScripts: s.has_scripts,
    sync: s.sync,
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
  "Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py";

export function installCommand(skill: DisplaySkill): string {
  if (skill.sync === "installed_no_hub_source") {
    return `python ${INSTALLER_PATH} sync-back ${skill.name} --from claude`;
  }
  return `python ${INSTALLER_PATH} install ${skill.name} --collection ${skill.collection}`;
}

export function copyButtonLabel(skill: DisplaySkill): string {
  return skill.sync === "installed_no_hub_source" ? "复制回灌命令" : "复制安装命令";
}
