import { useMemo, useRef, useState } from "react";
import type { OsState } from "../types";
import { flattenStore, ORPHAN_COLLECTION_LABEL } from "../lib/skills";
import type { DisplaySkill } from "../lib/skills";
import { SkillCard } from "../components/SkillCard";
import { SkillDrawer } from "../components/SkillDrawer";

interface Props {
  state: OsState;
}

const ALL = "all";

export function StorePage({ state }: Props) {
  const allSkills = useMemo(() => flattenStore(state.store), [state.store]);
  const collectionNames = useMemo(
    () => state.store.collections.map((c) => c.name),
    [state.store.collections],
  );

  const [activeFilter, setActiveFilter] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [openSkill, setOpenSkill] = useState<DisplaySkill | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  const filtered = allSkills.filter((s) => {
    const matchesCollection = activeFilter === ALL || s.collection === activeFilter;
    if (!matchesCollection) return false;
    if (query.trim() === "") return true;
    const q = query.trim().toLowerCase();
    // description can be absent: the generator emits an empty string when a
    // SKILL.md has no frontmatter description, and warns about it.
    return (
      s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q)
    );
  });

  function openDrawerFor(skill: DisplaySkill, trigger: HTMLElement) {
    triggerRef.current = trigger;
    setOpenSkill(skill);
  }

  return (
    <section>
      <div className="store-bar mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by collection">
        <button
          type="button"
          aria-pressed={activeFilter === ALL}
          onClick={() => setActiveFilter(ALL)}
          className={
            "font-mono-heading rounded-full border px-3.5 py-[5px] text-[12px] " +
            (activeFilter === ALL ? "border-ink bg-ink text-white" : "border-grid bg-panel text-ink-soft")
          }
        >
          All · {allSkills.length}
        </button>
        {collectionNames.map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={activeFilter === name}
            onClick={() => setActiveFilter(name)}
            className={
              "font-mono-heading rounded-full border px-3.5 py-[5px] text-[12px] " +
              (activeFilter === name ? "border-ink bg-ink text-white" : "border-grid bg-panel text-ink-soft")
            }
          >
            {name}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={activeFilter === ORPHAN_COLLECTION_LABEL}
          onClick={() => setActiveFilter(ORPHAN_COLLECTION_LABEL)}
          className={
            "font-mono-heading rounded-full border px-3.5 py-[5px] text-[12px] " +
            (activeFilter === ORPHAN_COLLECTION_LABEL
              ? "border-ink bg-ink text-white"
              : "border-grid bg-panel text-ink-soft")
          }
        >
          {ORPHAN_COLLECTION_LABEL}
        </button>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search skills..."
          aria-label="Search skills"
          className="search font-mono-heading ml-auto w-[220px] rounded-[3px] border border-grid bg-panel px-3 py-1.5 text-[12px] text-ink max-[900px]:ml-0 max-[900px]:w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[13px] text-stale">No matching skills.</p>
      ) : (
        <div className="cards grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3">
          {filtered.map((s) => (
            <SkillCard
              key={`${s.collection}/${s.name}`}
              skill={s}
              onOpen={(trigger) => openDrawerFor(s, trigger)}
            />
          ))}
        </div>
      )}

      <SkillDrawer
        skill={openSkill}
        targets={state.store.targets ?? []}
        triggerRef={triggerRef}
        onClose={() => setOpenSkill(null)}
      />
    </section>
  );
}
