import { useState } from "react";
import { useOsState } from "./useOsState";
import { StateMissing } from "./components/StateMissing";
import { SnapshotHeader } from "./components/SnapshotHeader";
import { Tabs } from "./components/Tabs";
import type { TabDef } from "./components/Tabs";
import { DashboardPage } from "./pages/DashboardPage";
import { ProjectPage } from "./pages/ProjectPage";
import { StorePage } from "./pages/StorePage";

const TABS: TabDef[] = [
  { id: "dash", label: "总览", controls: "page-dash" },
  { id: "proj", label: "项目", controls: "page-proj" },
  { id: "store", label: "技能商店", controls: "page-store" },
];

export function App() {
  const status = useOsState();
  const [activeTab, setActiveTab] = useState("dash");

  if (status.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono-heading text-[13px] text-stale">加载中…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return <StateMissing />;
  }

  const { state } = status;

  return (
    <div>
      <header className="sticky top-0 z-10 border-b-2 border-ink bg-paper">
        <SnapshotHeader meta={state.meta} policy={state.policy} />
        <Tabs tabs={TABS} activeId={activeTab} onSelect={setActiveTab} />
      </header>

      <div className="mx-auto max-w-[1080px] px-6 pb-20">
        {activeTab === "dash" && <DashboardPage state={state} />}
        {activeTab === "proj" && <ProjectPage state={state} />}
        {activeTab === "store" && <StorePage state={state} />}
      </div>

      <footer className="font-mono-heading mx-auto mt-10 flex max-w-[1080px] flex-wrap gap-[18px] border-t border-grid px-6 py-4 text-[11px] text-stale">
        <span>只读快照 · 文件系统是唯一事实源</span>
        <span>重新生成:cd os-ui/generator &amp;&amp; uv run python generate.py</span>
        <span>os-ui frontend v0.1</span>
      </footer>
    </div>
  );
}
