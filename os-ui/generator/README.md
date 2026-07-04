# os-ui/generator

Read-only Python scanner (standard library only, uv-managed) that walks this
repository and writes `os-ui/frontend/public/state.json` per the schema in
[`../DESIGN.md`](../DESIGN.md) Section 2. It never modifies repository content
and never runs `git commit`.

## Commands

```bash
cd os-ui/generator
uv run python generate.py            # generate state.json once, then validate
uv run python generate.py --watch    # foreground dev tool: re-generate every
                                      # 2s when a source file changes; Ctrl-C to stop
```

`state.json` is gitignored (see `../.gitignore`) — it is a cache, not a
source of truth. Missing or unparseable repository sections become `null` or
`[]` rather than invented data; warnings go to stderr.
