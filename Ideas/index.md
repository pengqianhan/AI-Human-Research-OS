# Ideas

This directory is an OKF bundle for research ideas in the AI-Human Research OS.
Each substantive idea should be represented as a Markdown concept with YAML
frontmatter. Folder-shaped ideas may also be nested OKF bundles.

# Idea Bundles

* [Idea example](idea_example/) - Worked OKF bundle for a promoted idea that validates the OS pipeline with a linear-fit micro-experiment.

# Local Profile

Idea concept documents use `type: Idea` and should include `title`,
`description`, `status`, `created`, and optional `tags`.

Status values:

* `raw` - captured but not yet assessed.
* `exploring` - being discussed, scoped, or connected to references.
* `feasible` - ready for a smallest useful probe.
* `promoted` - converted into a project or committed experiment path.
* `dropped` - intentionally set aside.

For folder-shaped ideas, keep the idea's local entry point at
`<idea-folder>/index.md` and put concept documents beside it. The nested folder
can be read as its own OKF bundle and as part of this parent Ideas bundle.
