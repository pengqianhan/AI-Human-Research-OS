---
type: Tool
title: CUA Driver
description: Open-source computer-use driver from the trycua project, offering element-addressed accessibility actions and coordinate input under a best-effort background policy that tries to leave the user's active desktop undisturbed.
resource: https://github.com/trycua/cua
tags:
- computer-use-agents
- accessibility-api
- agent-interfaces
timestamp: 2026-11-05T00:00:00Z
---

# Definition

CUA Driver is part of trycua's cua project of cross-platform drivers and sandboxes. It supports programmatic, accessibility, and visual interaction, and favors accessibility-based actions in the background so the user's active desktop is preserved, with foreground input available on request. By default it returns the accessibility tree and a screenshot together, asks agents to refresh element indices before acting, separates input delivery from verified effect, and checks caller-defined postconditions through a separate operation. This description follows the account in the Hybrid Computer Use paper and its citations of the driver's documentation; the documentation itself was not opened.

# Papers

* [Hybrid Computer Use](../papers/2610.41432.md) - matched baseline on OSWorld 2.0 (68.82 Partial with GPT-6 Astra), on OSWorld 1.0 across four models, and on three further benchmarks, always with foreground input enabled.
* [OpenGCUA](../papers/2610.22200.md) - its preliminary macOS adapter uses the driver unmodified.

# Notes

The Hybrid Computer Use comparison turns on foreground input for all calls, which is not the driver's design goal of background use, and that paper's authors built the competing interface.

# Related

* [OSWorld](osworld.md) - main benchmark for the comparison above.
* [Windows Agent Arena](windows-agent-arena.md) - Windows comparison.
