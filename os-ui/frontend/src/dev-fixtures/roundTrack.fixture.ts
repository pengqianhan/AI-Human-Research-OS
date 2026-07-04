import type { EvaluationContract, Round } from "../types";

/**
 * Dev-only fixture used to exercise RoundTrack's non-empty rendering branch.
 * This mirrors the shape of the mockup's example circle_packing rounds
 * (R0..R3 + a 3-way R3 parallel fork) but MUST NOT ship in state.json or be
 * imported from any production page — it exists purely so this component's
 * SVG logic can be visually verified before real Code/runs/ data exists
 * (DESIGN.md: real round data is gated on circle_packing M2).
 *
 * To preview it locally: temporarily import ROUND_TRACK_FIXTURE_ROUNDS in
 * ProjectPage.tsx in place of project.rounds, run `npm run dev`, look at
 * the Project page, then revert the import before committing.
 */
export const ROUND_TRACK_FIXTURE_ROUNDS: Round[] = [
  { id: "R0", score: 2.318, valid: true, artifacts: ["Code/runs/r0-grid/result.json"], tasks: [] },
  { id: "R1", score: 2.412, valid: true, artifacts: ["Code/runs/r1/result.json"], tasks: [] },
  { id: "R2", score: 2.581, valid: true, artifacts: ["Code/runs/r2-slsqp/result.json"], tasks: [] },
  {
    id: "R3a",
    score: 2.603,
    valid: true,
    artifacts: ["Code/runs/r3-anneal/result.json"],
    tasks: ["Tasks/anneal"],
  },
  {
    id: "R3b",
    score: 2.597,
    valid: true,
    artifacts: ["Code/runs/r3-force/result.json"],
    tasks: ["Tasks/force-relax"],
  },
  {
    id: "R3c",
    score: null,
    valid: false,
    note: "重叠 2 处",
    artifacts: ["Code/runs/r3-hybrid/result.json"],
    tasks: ["Tasks/hybrid"],
  },
];

export const ROUND_TRACK_FIXTURE_EVALUATION: EvaluationContract = {
  target: 2.6,
  best_known: 2.63598844,
  source: "provenance unverified — Evaluation Contract",
};
