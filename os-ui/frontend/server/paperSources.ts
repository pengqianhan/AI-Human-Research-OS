import { resolve } from "node:path";
import { errorText } from "./process.ts";
import { json } from "./types.ts";
import type { ApiContext, ApiHandler, ApiResponse } from "./types.ts";

const SOURCE_ID = /^[a-z]+$/;
const KEY_NAME = /^[A-Z][A-Z_]*$/;
/** Same shape paper_search.py accepts; checked here too so a bad value never reaches a child. */
const KEY_VALUE = /^[A-Za-z0-9._~+/=:-]{8,256}$/;
const ROUTES = ["GET /", "POST /", "POST /read-order", "POST /key"];

/**
 * The Papers button's two writes (Human Owner, 2026-09-30), both run through
 * paper-search, which owns the files and their rules:
 *
 * - `GET /`: the switches and which per-user keys are set.
 * - `POST /` `{source, enabled}`: flip one source's switch in
 *   memory/paper-sources.json.
 * - `POST /read-order` `{order}`: set the sources `fetch` reads a paper's full
 *   text from, first tried first.
 * - `POST /key` `{name, value}`: store one key in the repository's gitignored
 *   .env, or clear it when `value` is empty. The value reaches the script on
 *   stdin and never comes back: responses carry only whether each key is set.
 */
export function paperSourcesApi(ctx: ApiContext): ApiHandler {
  const script = resolve(ctx.repoRoot, "research-skills-hub/open-paper-skills/paper-search/scripts/paper_search.py");
  let queue: Promise<unknown> = Promise.resolve();

  async function handle(route: string, req: Parameters<ApiHandler>[0]): Promise<ApiResponse> {
    try {
      let args = ["sources", "--json"];
      let input = "";
      if (route === "POST /") {
        const body = (await req.json()) as Record<string, unknown>;
        const source = String(body.source ?? "");
        if (!SOURCE_ID.test(source)) return json(400, { error: `bad source: ${source}` });
        if (typeof body.enabled !== "boolean") return json(400, { error: "enabled must be true or false" });
        args.push(body.enabled ? "--enable" : "--disable", source);
      } else if (route === "POST /read-order") {
        const body = (await req.json()) as Record<string, unknown>;
        const order = body.order;
        if (!Array.isArray(order) || order.length === 0 || !order.every((s) => typeof s === "string" && SOURCE_ID.test(s))) {
          return json(400, { error: "order must be a list of source ids" });
        }
        // paper_search.py checks the ids against its readers.
        args.push("--read-order", order.join(","));
      } else if (route === "POST /key") {
        const body = (await req.json()) as Record<string, unknown>;
        const name = String(body.name ?? "");
        const value = typeof body.value === "string" ? body.value.trim() : "";
        if (!KEY_NAME.test(name)) return json(400, { error: `bad key name: ${name}` });
        if (value !== "" && !KEY_VALUE.test(value)) {
          return json(400, { error: "a key is one token of 8 to 256 letters, digits, or ._~+/=:-" });
        }
        args = value === "" ? ["keys", "--clear", name, "--json"] : ["keys", "--set", name, "--json"];
        input = value;
      }
      const result = await ctx.run([...ctx.python(), script, ...args], { cwd: ctx.repoRoot, input });
      if (result.code !== 0) {
        // Exit 2 is the script refusing the call; its last stderr line says
        // why without argparse's usage block. It never contains the value.
        const reason = result.stderr.trim().split(/\r?\n/).pop() || `exit ${result.code}`;
        return json(result.code === 2 ? 400 : 500, { error: reason.slice(-500) });
      }
      return json(200, JSON.parse(result.stdout));
    } catch (error) {
      return json(500, { error: errorText(error, 500) });
    }
  }

  return (req) => {
    const route = `${req.method} ${req.path}`;
    if (!ROUTES.includes(route)) return Promise.resolve(json(404, { error: `no route ${route}` }));
    // Serialized so two quick clicks cannot interleave their rewrites.
    const job = queue.then(() => handle(route, req));
    queue = job;
    return job;
  };
}
