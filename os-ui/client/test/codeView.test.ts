import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, test } from "node:test";
import { BUNDLED_IDS } from "../../frontend/plugins/bundled.ts";
import { TRUNK_MOUNTS } from "../../frontend/server/api.ts";
import { BUNDLED_HANDLERS } from "../../frontend/server/pluginHandlers.ts";
import { loadPlugins } from "../../frontend/server/registry.ts";
import { context, fail, fakeRunner, ok } from "../../frontend/server/testkit.ts";
import type { Runner } from "../../frontend/server/types.ts";
import { desktopHandlers, findGit, GIT_RETRY_MS, rememberGit } from "../src/main/codeView.ts";
import { createHandler, pluginSites, workspaceRegistry } from "../src/main/protocol.ts";
import { tempTree } from "./helpers.ts";

const PLUGINS = join(import.meta.dirname, "..", "..", "frontend", "plugins");
const bundled = loadPlugins(PLUGINS, BUNDLED_IDS, "bundled", { trunk: TRUNK_MOUNTS, plugins: [] });
const sites = pluginSites(bundled.plugins);
const GIT = "/opt/fake/bin/git";

/** The client's handler for one workspace, as index.ts builds it: the desktop handlers, no skip. */
function client(workspace: string, run: Runner, log: (line: string) => void = () => {}, git: () => Promise<string | null> = async () => GIT) {
  const problems: string[] = [];
  const registry = workspaceRegistry(
    { ctx: context(workspace, { run }), trunk: TRUNK_MOUNTS, plugins: bundled.plugins, factories: desktopHandlers(BUNDLED_HANDLERS, { git, log }) },
    (p) => problems.push(p),
  );
  const handler = createHandler(() => ({ renderer: tempTree(), workspace, sites, registry, token: "t" }));
  return { handler, problems, registry };
}

/** A registered project P with a plain .git of its own. */
function project(): string {
  return tempTree({
    "projects-folder/P/PROJECT_MEMORY.md": "# P\n",
    "projects-folder/P/Code/a.txt": "a\n",
    "projects-folder/P/.git/HEAD": "ref: refs/heads/main\n",
    "projects-folder/P/.git/config": "[core]\n",
    "projects-folder/P/.git/objects/info/.keep": "",
    "projects-folder/P/.git/refs/heads/.keep": "",
  });
}

describe("the Code view's Git history in the desktop client", () => {
  test("mounted at /api/code-view/git on app://code-view only, without the token", async () => {
    const { handler, problems, registry } = client(project(), fakeRunner().run);
    assert.deepEqual(problems, []);
    assert.deepEqual(registry.byPlugin.get("code-view")!.map((m) => [m.prefix, m.token]), [["/api/code-view/git", false]]);
    assert.ok(!registry.app.some((m) => m.prefix.startsWith("/api/code-view")));
    // An unregistered project: the handler's own 404, which no git run precedes.
    const own = await handler(new Request("app://code-view/api/code-view/git/log?project=Nope"));
    assert.equal(own.status, 404);
    assert.deepEqual(await own.json(), { error: "no registered project Nope" });
    const app = await handler(new Request("app://research-os/api/code-view/git/log?project=Nope"));
    assert.equal(app.status, 404);
    assert.deepEqual(await app.json(), { error: "no endpoint /api/code-view/git/log" });
    for (const url of ["app://paper-wiki/api/code-view/git/log?project=Nope", "app://code-view/api/paper-wiki/status"]) {
      const other = await handler(new Request(url));
      assert.equal(other.status, 404, url);
      assert.equal(await other.text(), "Not found", url);
    }
  });

  test("what Git prints on a failure goes to the client's log, never to the page", async () => {
    const lines: string[] = [];
    const { run, calls } = fakeRunner((call) => (call.command.includes("--version") ? ok("git version 2.55.0\n") : fail(128, "fatal: SECRET-STDERR in .git/config\n")));
    const { handler } = client(project(), run, (line) => lines.push(line));
    const res = await handler(new Request("app://code-view/api/code-view/git/log?project=P"));
    assert.equal(res.status, 500);
    const text = await res.text();
    assert.equal(JSON.parse(text).error, "git rev-parse HEAD failed (exit 128)");
    assert.ok(!text.includes("SECRET"), text);
    assert.equal(calls[0]!.command[0], GIT, "the git the client found runs");
    assert.equal(lines.length, 1, lines.join("\n"));
    assert.match(lines[0]!, /^code-view git \/log rev-parse HEAD: .*SECRET-STDERR/);
  });

  test("no git found: the page is told so, and nothing runs", async () => {
    const { run, calls } = fakeRunner();
    const { handler } = client(project(), run, () => {}, async () => null);
    const res = await handler(new Request("app://code-view/api/code-view/git/?project=P"));
    assert.deepEqual(await res.json(), { repo: null, problem: "git was not found; see Settings" });
    assert.deepEqual(calls, []);
  });
});

describe("findGit", () => {
  const env = { PATH: ["relative/bin", "/ws/node_modules/.bin", "/usr/bin", "/opt/homebrew/bin"].join(":") };
  const exists = (have: string[]) => (file: string) => have.includes(file);
  const tools = (code: number) => async () => ({ code, output: "" });

  test("the first git in an absolute PATH entry, as the handler would find it", async () => {
    const found = await findGit({ env, dir: "/elsewhere", probe: tools(0), platform: "linux", exists: exists(["relative/bin/git", "/usr/bin/git", "/opt/homebrew/bin/git"]) });
    assert.equal(found, "/usr/bin/git");
  });

  test("on a Mac without the Command Line Tools, /usr/bin/git is their stub and never runs", async () => {
    const asked: string[][] = [];
    const probe = async (command: string[]) => {
      asked.push(command);
      return { code: 2, output: "" };
    };
    assert.equal(await findGit({ env, dir: "/elsewhere", probe, platform: "darwin", exists: exists(["/usr/bin/git"]) }), null);
    assert.deepEqual(asked, [["/usr/bin/xcode-select", "-p"]], "only xcode-select is asked, not the stub");
    assert.equal(await findGit({ env, dir: "/elsewhere", probe: tools(0), platform: "darwin", exists: exists(["/usr/bin/git"]) }), "/usr/bin/git");
    assert.equal(await findGit({ env, dir: "/elsewhere", probe: tools(2), platform: "darwin", exists: exists(["/opt/homebrew/bin/git"]) }), "/opt/homebrew/bin/git");
  });

  test("none on PATH", async () => {
    assert.equal(await findGit({ env, dir: "/elsewhere", probe: tools(0), platform: "linux", exists: exists([]) }), null);
  });
});

describe("rememberGit", () => {
  test("a git found is kept; none found is asked again after GIT_RETRY_MS", async () => {
    let clock = 0;
    const answers = [null, null, "/usr/bin/git", "/other/git"];
    let asked = 0;
    const git = rememberGit(async () => answers[asked++] ?? null, () => clock);
    assert.equal(await git(), null);
    clock += GIT_RETRY_MS - 1;
    assert.equal(await git(), null);
    assert.equal(asked, 1, "not asked again within the interval");
    clock += 1;
    assert.equal(await git(), null);
    clock += GIT_RETRY_MS;
    assert.equal(await git(), "/usr/bin/git");
    clock += 10 * GIT_RETRY_MS;
    assert.equal(await git(), "/usr/bin/git");
    assert.equal(asked, 3);
  });

  test("requests at once share one lookup; a lookup that throws counts as none found", async () => {
    let asked = 0;
    const git = rememberGit(async () => {
      asked++;
      throw new Error("boom");
    });
    assert.deepEqual(await Promise.all([git(), git(), git()]), [null, null, null]);
    assert.equal(asked, 1);
  });
});
