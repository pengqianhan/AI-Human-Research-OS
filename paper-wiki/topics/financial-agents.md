---
type: Topic
title: Financial agents
description: Papers about LLM agents that analyze, trade, or manage risk in financial markets.
tags:
- financial-agents
- financial-trading
- multi-agent-systems
timestamp: 2026-08-28T00:00:00Z
---

# Scope

This topic tracks papers where LLM or multi-agent systems make financial decisions — trading, portfolio construction, risk management — under market data, either backtested or live, and are evaluated primarily by financial performance metrics (return, Sharpe/Sortino ratio, drawdown) rather than by general reasoning benchmarks.

# Papers

* [TradingAgents](../papers/2412.20138.md) - trading-firm-inspired agents (analysts, bull/bear researchers, trader, risk team) coordinated through a structured-document protocol, with natural-language debate reserved for the research and risk-negotiation stages; backtested on three large-cap tickers over a ~3-month window.
* [Orchestration Framework for Financial Agents](../papers/2512.02227.md) - FinAgent maps all nine stages of a traditional algorithmic-trading pipeline onto agents coordinated via MCP (orchestrator control) and A2A (agent/memory communication), with protocol-level leakage prevention as an explicit design axis; backtested on a seven-stock equity universe and BTC/USDT.
* [AI-Trader](../papers/2512.10971.md) - a live, data-uncontaminated benchmark giving six LLM backbones only prices, holdings, and five generic tools across U.S. equities, A-shares, and crypto, finding general intelligence does not predict trading capability and risk-control discipline drives cross-market robustness.

# Synthesis

These three papers occupy different points on the same design spectrum: how much structure to give the agent versus how much it must construct for itself, and whether evaluation is backtested or live. TradingAgents sits at the most structured end — role-specialized analyst/researcher/trader/risk agents each receive curated multi-modal inputs and communicate mostly through structured reports, with natural-language deliberation confined to two debate stages. FinAgent generalizes that structure into explicit infrastructure: rather than a fixed five-role pipeline, it names nine roles matching a traditional algorithmic-trading system and formalizes their communication as two standardized protocols (MCP, A2A), while making leakage prevention an explicit, protocol-enforced property of every inter-agent message rather than an implicit backtesting discipline. AI-Trader sits at the opposite end of the structure axis: it strips the agent down to a single ReAct loop with five generic tools and zero pre-packaged information, deliberately removing the role specialization and curated-input design both other papers rely on, in order to isolate how much of "financial agent" capability is actually backbone-model reasoning versus scaffolding — and it is also the only one of the three evaluated live rather than backtested, trading real, uncontaminated market data instead of a historical window. A recurring cross-paper caveat is instructive: TradingAgents explicitly flags its own unusually high Sharpe ratios and short (~3-month) backtest window as unverified against an independent out-of-sample period; FinAgent's own results table shows its nine-agent system underperforming a memory-less, LLM-free equal-weighted baseline on raw return by more than 2x, conceding the trade-off is toward risk control rather than return; and AI-Trader reports single-run, non-repeated live results with no variance estimate across a ~2-to-5.5-week window. None of the three papers backtests or evaluates against either of the other two directly, so it remains unknown whether AI-Trader's minimal-scaffold agents would improve if given TradingAgents' role specialization or FinAgent's protocol-level leakage guarantees, or whether either backtested system's reported edge would survive AI-Trader's live, uncontaminated evaluation regime.

# Open Questions

* Does role specialization and structured-document communication (TradingAgents, FinAgent) measurably outperform a minimal ReAct-plus-tools agent (AI-Trader) once both are evaluated under the same live, uncontaminated protocol, or does most of the reported advantage come from the backtest setting itself?
* FinAgent's own equal-weighted baseline beats its full nine-agent system on raw return — how much of any financial-agent architecture's benefit over a simple passive or rule-based baseline is genuinely attributable to agentic reasoning versus a risk overlay that requires no LLM at all?
* AI-Trader finds risk-control discipline, not raw reasoning strength, predicts cross-market robustness — do TradingAgents' and FinAgent's risk-management-team/risk-agent designs produce agents that would score well on AI-Trader's live, autonomous-information-acquisition protocol, or does their reliance on curated inputs make that comparison structurally unfair?
* None of these papers reports variance across repeated runs or multiple non-overlapping evaluation windows for its headline financial metrics — how stable are any of the reported cross-model or cross-architecture rankings once that is measured?
* What is the minimum agent scaffolding (memory, protocol-level leakage prevention, role specialization) needed before a live, fully autonomous financial agent (AI-Trader's paradigm) becomes safe to evaluate with real capital rather than paper trading?
