import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import scan_related_projects as scan


def make_repo(name, description, queries, stars=800):
    return {
        "name": name,
        "full_name": f"example/{name}",
        "html_url": f"https://github.com/example/{name}",
        "description": description,
        "queries": list(queries),
        "stargazers_count": stars,
        "pushed_at": "2026-11-22T00:00:00Z",
    }


class ScanRelatedProjectsTest(unittest.TestCase):
    def test_broad_self_improving_queries_require_research_topic(self):
        qa_agent = make_repo(
            "agent-qa",
            "Open-source self-improving QA agent for software teams.",
            ['"self-improving" agent'],
            stars=820,
        )
        prompt_repo = make_repo(
            "most-capable-agent-system-prompt",
            "A copy-paste system prompt that builds a self-improving agent system.",
            ['"self-improving" agent'],
            stars=889,
        )
        science_claw = make_repo(
            "ScienceClaw",
            "Verifiable program-level self-evolution for AI-for-Science agents.",
            ['"self-evolving" agent'],
            stars=1033,
        )
        self.assertFalse(scan.admissible(qa_agent, 500))
        self.assertFalse(scan.admissible(prompt_repo, 500))
        self.assertTrue(scan.admissible(science_claw, 500))

    def test_explicit_rsi_query_remains_admissible(self):
        rsi_agent = make_repo(
            "RSIAgent",
            "A multi-agent framework for recursive self-improvement in new environments.",
            ['"recursive self-improvement"'],
            stars=624,
        )
        self.assertEqual(scan.section_for(rsi_agent), scan.RSI)
        self.assertTrue(scan.admissible(rsi_agent, 500))

    def test_research_section_rejects_readme_only_non_research_hits(self):
        roadmap = make_repo(
            "Roadmap-Docs",
            "Best Data Science, Data Analytics, AI, and SDE roadmaps.",
            ['"academic research" agent'],
            stars=900,
        )
        ai_scientist = make_repo(
            "AI-Scientist-v3",
            "The Agentic Scientist: Automated Scientific Discovery.",
            ['"AI scientist"'],
            stars=751,
        )
        self.assertEqual(scan.section_for(roadmap), scan.RESEARCH)
        self.assertFalse(scan.admissible(roadmap, 500))
        self.assertTrue(scan.admissible(ai_scientist, 500))

    def test_skill_repos_enforce_star_floor_and_research_topic(self):
        low_star_skill = make_repo(
            "Free-Research-Skills",
            "Research skills for academic paper writing.",
            ['"research skills"'],
            stars=499,
        )
        high_star_skill = make_repo(
            "research-skills",
            "Research experiences encapsulated into Agent skills.",
            ['"research skills"'],
            stars=500,
        )
        self.assertFalse(scan.admissible(low_star_skill, 500))
        self.assertTrue(scan.admissible(high_star_skill, 500))

    def test_pr_body_describes_equal_and_distinct_skill_thresholds(self):
        repo = make_repo(
            "AI-Scientist-v3",
            "Automated Scientific Discovery.",
            ['"AI scientist"'],
            stars=751,
        )
        equal = scan.pr_body([repo], [], {}, "2026-09-25", 500, 500, 3)
        self.assertIn("at least 500 stars (a research topic for skill repos", equal)
        higher = scan.pr_body([repo], [], {}, "2026-09-25", 500, 800, 3)
        self.assertIn("at least 500 stars (800 stars and a research topic", higher)


if __name__ == "__main__":
    unittest.main()
