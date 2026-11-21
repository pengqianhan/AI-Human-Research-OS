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
const FILTER_PILL = "rounded-full px-3 py-[5px] text-[12.5px] font-medium ";
const FILTER_ON = "bg-accent text-on-accent shadow-sh1";
const FILTER_OFF = "bg-card text-ink2 shadow-sh1 hover:text-ink";

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
            FILTER_PILL +
            (activeFilter === ALL ? FILTER_ON : FILTER_OFF)
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
              FILTER_PILL +
              (activeFilter === name ? FILTER_ON : FILTER_OFF)
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
            FILTER_PILL +
            (activeFilter === ORPHAN_COLLECTION_LABEL ? FILTER_ON : FILTER_OFF)
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
          className="search ml-auto w-[240px] rounded-[10px] bg-card px-3 py-[7px] text-[13px] text-ink shadow-[inset_0_0_0_1px_var(--line2)] placeholder:text-faint"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[13.5px] text-muted">No matching skills.</p>
      ) : (
        <div className="cards grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3.5">
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
