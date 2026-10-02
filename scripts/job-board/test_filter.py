import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from job_filter import company_denied, company_too_big, is_ai_infra_engineering


class FilterTests(unittest.TestCase):
    def test_keeps_inference_and_gpu_kernel_titles(self):
        self.assertTrue(is_ai_infra_engineering("Software Engineer, Inference"))
        self.assertTrue(is_ai_infra_engineering("Member of Technical Staff, GPU Kernels"))
        self.assertTrue(is_ai_infra_engineering("GPU Compiler Engineer"))
        self.assertTrue(is_ai_infra_engineering("ML Platform Engineer"))
        self.assertTrue(is_ai_infra_engineering("ML Systems Engineer"))
        self.assertTrue(is_ai_infra_engineering("Training Infrastructure Engineer"))

    def test_drops_generic_applied_and_research_titles(self):
        self.assertFalse(is_ai_infra_engineering("Backend Engineer"))
        self.assertFalse(is_ai_infra_engineering("AI Engineer"))
        self.assertFalse(is_ai_infra_engineering("Research Scientist, Inference"))
        self.assertFalse(is_ai_infra_engineering("Senior Data Scientist, Causal Inference"))
        self.assertFalse(is_ai_infra_engineering("Compiler Engineer"))
        self.assertFalse(is_ai_infra_engineering("Systems Engineer"))
        self.assertFalse(is_ai_infra_engineering("Software Engineer - Linux Kernel"))
        self.assertTrue(is_ai_infra_engineering("Kernel Engineer"))

    def test_drops_management_and_non_engineering(self):
        self.assertFalse(
            is_ai_infra_engineering("Engineering Manager, Inference Infrastructure")
        )
        self.assertFalse(is_ai_infra_engineering("Sales Engineer, GPU"))
        self.assertFalse(is_ai_infra_engineering("Developer Advocate, MAX Inference & Serving"))

    def test_company_size_and_denylist(self):
        self.assertTrue(company_too_big("1K-5K"))
        self.assertTrue(company_too_big("10000+"))
        self.assertFalse(company_too_big("11-50"))
        self.assertFalse(company_too_big("501-1K"))
        self.assertFalse(company_too_big(None))
        self.assertTrue(company_denied("Anthropic"))
        self.assertTrue(company_denied("Anduril Industries"))
        self.assertFalse(company_denied("Metabase"))
        self.assertFalse(company_denied("AssemblyAI"))


if __name__ == "__main__":
    unittest.main()
