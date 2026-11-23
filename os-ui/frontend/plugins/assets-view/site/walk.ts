/**
 * The Assets view's folder walk (os-ui/PLUGINS.md Part 3, §4.2 "Walk"): a
 * group's folder is listed through the read channel, then each subfolder,
 * depth first, in the channel's order. Pure: the listing is a function the
 * caller gives (main.ts fetches ./_os/list, the tests read a fixture tree), so
 * `npm test` runs it in Node.
 *
 * The walk is bounded, and says where it stopped, so nothing is left out
 * without the view saying so: at most WALK.depth folder levels below the
 * group's folder, WALK.listings listings, and WALK.files files a group. A
 * listing the channel cut (`truncated`, more than 5,000 names) and a
 * subfolder that could not be listed are recorded too. A link inside the
 * group that leads back up (the channel follows links that stay in the root)
 * gives the same folder again under a longer path; the depth and listing caps
 * end it.
 */

/** One entry of a listing, as the read channel gives it (`size` is 0 for a folder). */
export interface Entry {
  name: string;
  dir: boolean;
  size: number;
}

/** A listing, or the channel's status when it is not a 200 (0: the request did not reach the app). */
export type ListAnswer = { ok: true; entries: Entry[]; truncated: boolean } | { ok: false; status: number };

/** How far a group's walk goes (os-ui/PLUGINS.md Part 3, §1 fact 6). */
export const WALK = {
  /** Folder levels below the group's folder that are listed: `Figs/a/b/c/d/` is, `Figs/a/b/c/d/e/` is not. */
  depth: 4,
  /** Listings a group makes at most, its own folder's included. */
  listings: 40,
  /** Files a group lists at most. */
  files: 500,
} as const;

/** A file the walk found: its project path, its path below the group's folder, and the listing's size. */
export interface WalkFile {
  path: string;
  rel: string;
  name: string;
  size: number;
  /** The project path of the folder it is in. */
  folder: string;
}

export interface WalkResult {
  /** The group's folder: listed, not there (404: missing, or a link the view may not follow), or another answer. */
  root: "ok" | "missing" | "error";
  /** The root listing's status when it is not "ok" (0: the app could not be reached). */
  status: number;
  /** The group's folder holds nothing the channel lists (dot files never appear). */
  empty: boolean;
  files: WalkFile[];
  /** Every folder listed, the group's own first, in walk order. */
  folders: string[];
  /** The README.md of each listed folder that has one, as a project path: it may describe the files beside it. */
  readmes: string[];
  /** Listings the channel cut at its 5,000 names. */
  truncated: string[];
  /** Subfolders whose listing failed, with the status. */
  failed: { folder: string; status: number }[];
  /** Subfolders not listed: deeper than WALK.depth. */
  deeper: string[];
  /** Subfolders not listed: the walk had made WALK.listings listings. */
  unlisted: string[];
  /** The walk stopped at WALK.files files; more were there. */
  capped: boolean;
}

/**
 * Walks the group folder `folder` (a project path such as "Figs"), listing
 * project paths through `list`, one listing at a time.
 */
export async function walk(folder: string, list: (path: string) => Promise<ListAnswer>): Promise<WalkResult> {
  const result: WalkResult = { root: "ok", status: 200, empty: false, files: [], folders: [], readmes: [], truncated: [], failed: [], deeper: [], unlisted: [], capped: false };
  let listings = 1;
  const first = await list(folder);
  if (!first.ok) return { ...result, root: first.status === 404 ? "missing" : "error", status: first.status };
  result.folders.push(folder);
  result.empty = first.entries.length === 0 && !first.truncated;

  /** Lists `entries` of the folder `path` (`rel` below the group's folder, `depth` levels down); false once the file cap stops the walk. */
  const descend = async (path: string, rel: string, depth: number, entries: readonly Entry[], truncated: boolean): Promise<boolean> => {
    if (truncated) result.truncated.push(path);
    for (const entry of entries) {
      // The channel never lists a dot name; a fake listing might.
      if (entry.name.startsWith(".")) continue;
      const childPath = `${path}/${entry.name}`;
      const childRel = rel === "" ? entry.name : `${rel}/${entry.name}`;
      if (!entry.dir) {
        if (result.files.length >= WALK.files) {
          result.capped = true;
          return false;
        }
        result.files.push({ path: childPath, rel: childRel, name: entry.name, size: entry.size, folder: path });
        if (entry.name === "README.md") result.readmes.push(childPath);
        continue;
      }
      if (depth + 1 > WALK.depth) {
        result.deeper.push(childPath);
        continue;
      }
      if (listings >= WALK.listings) {
        result.unlisted.push(childPath);
        continue;
      }
      listings++;
      const sub = await list(childPath);
      if (!sub.ok) {
        result.failed.push({ folder: childPath, status: sub.status });
        continue;
      }
      result.folders.push(childPath);
      if (!(await descend(childPath, childRel, depth + 1, sub.entries, sub.truncated))) return false;
    }
    return true;
  };
  await descend(folder, "", 0, first.entries, first.truncated);
  return result;
}
