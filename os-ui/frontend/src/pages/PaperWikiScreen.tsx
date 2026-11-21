import { PaperWikiPage } from "./PaperWikiPage";
import { Icon } from "../shell/icons";

/**
 * The Paper wiki page of the new layout: mockup C's plugin band, then the
 * real graph and timeline viewer (PaperWikiPage's iframe, on its own origin
 * in the desktop client) filling the rest of the page. Its reading-status
 * buttons live inside the viewer.
 */
export function PaperWikiScreen() {
  return (
    <div className="flex h-full flex-col gap-3 p-3.5">
      <header className="flex shrink-0 flex-wrap items-center gap-3 px-1.5">
        <h1 className="font-serif text-[22px] font-medium leading-tight" tabIndex={-1} data-page-title>
          Paper wiki
        </h1>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-accent-tint px-3 py-2 text-[12.5px] text-accent-ink">
          <Icon name="puzzle" size={14} />
          <span className="min-w-0">
            <b className="font-semibold">Paper Wiki · bundled plugin</b> — the graph and timeline viewer of <code>paper-wiki/</code>, on its own origin
          </span>
        </div>
      </header>
      <div className="card min-h-0 flex-1 overflow-hidden">
        <PaperWikiPage />
      </div>
    </div>
  );
}
