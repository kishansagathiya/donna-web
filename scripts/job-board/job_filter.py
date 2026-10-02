"""Decide which listings belong on the AI infrastructure job board."""

import re

# Late-stage names that still show up on startup boards.
DENIED_COMPANIES = (
    "stripe",
    "openai",
    "anthropic",
    "databricks",
    "anduril",
    "google",
    "meta",
    "amazon",
    "microsoft",
    "apple",
    "nvidia",
    "tesla",
    "amd",
)

_NON_ENGINEERING = re.compile(
    r"\b("
    r"sales|account executive|recruiter|recruiting|marketing|legal|counsel|"
    r"designer|product manager|product management|finance|accountant|"
    r"customer success|customer support|technical support|support specialist|"
    r"chief of staff|technical program manager|\btpm\b|advocate"
    r")\b",
    re.I,
)
_MANAGEMENT = re.compile(
    r"\b(managers?|directors?|vice president|\bvp\b|head of|chief)\b",
    re.I,
)
_ENGINEERING = re.compile(
    r"\b(engineers?|developers?|member of technical staff|\bmts\b|\bsre\b|site reliability)\b",
    re.I,
)
_CAUSAL_INFERENCE = re.compile(
    r"\b(causal|statistical|bayesian)\s+inference\b",
    re.I,
)
_INFERENCE = re.compile(r"\binference\b", re.I)
_GPU = re.compile(r"\b(gpus?|cuda|rocm)\b", re.I)
_KERNEL = re.compile(r"\bkernels?\b", re.I)
_OS_KERNEL = re.compile(
    r"linux kernel|kernel/driver|kernel and bios|os,\s*kernel|kernel test|assurance kernel",
    re.I,
)
_QUANT = re.compile(r"\bquantiz", re.I)
_KV = re.compile(r"kv[-\s]?cache", re.I)
_STACK = re.compile(r"\b(vllm|sglang|tensorrt|triton|mlir|xla)\b", re.I)
_ML_PLATFORM = re.compile(
    r"\b(ml|ai|machine learning)\s+(infra|infrastructure|platform|systems)\b",
    re.I,
)
_SERVING = re.compile(
    r"\b(training infrastructure|distributed training|model serving|llm serving)\b",
    re.I,
)
_COMPILER = re.compile(r"\bcompiler\b", re.I)
_COMPILER_CONTEXT = re.compile(r"\b(ml|gpu|ai|model|tensor|kernel|llm)\b", re.I)
_PLATFORM_ENGINEER = re.compile(
    r"\b(systems|infrastructure|platform)\s+engineer",
    re.I,
)


def company_denied(name):
    norm = re.sub(r"[^a-z0-9]+", " ", (name or "").lower()).strip()
    if not norm:
        return False
    for bad in DENIED_COMPANIES:
        if norm == bad or norm.startswith(bad + " "):
            return True
    return False


def company_too_big(band):
    """True when a headcount band starts at 1,000 employees or more."""
    if not band:
        return False
    first = re.split(r"[-–—]", str(band).strip(), maxsplit=1)[0]
    first = first.lower().replace(",", "").replace("+", "").strip()
    thousands = re.fullmatch(r"(\d+)\s*k", first)
    if thousands:
        return int(thousands.group(1)) * 1000 >= 1000
    number = re.fullmatch(r"(\d+)", first)
    if number:
        return int(number.group(1)) >= 1000
    return False


def _os_kernel_only(title):
    if not _OS_KERNEL.search(title):
        return False
    return not (
        _GPU.search(title)
        or _INFERENCE.search(title)
        or _STACK.search(title)
        or re.search(r"\b(ml|ai|llm|genai)\b", title, re.I)
    )


def is_ai_infra_engineering(title):
    """Engineering role whose title is in or relevant to AI infrastructure."""
    if not title or _NON_ENGINEERING.search(title) or _MANAGEMENT.search(title):
        return False
    if not _ENGINEERING.search(title):
        return False
    if _CAUSAL_INFERENCE.search(title):
        return False
    if _INFERENCE.search(title) or _GPU.search(title):
        return True
    if _KERNEL.search(title) and not _os_kernel_only(title):
        return True
    if _QUANT.search(title) or _KV.search(title) or _STACK.search(title):
        return True
    if _ML_PLATFORM.search(title) or _SERVING.search(title):
        return True
    if _COMPILER.search(title) and _COMPILER_CONTEXT.search(title):
        return True
    if _PLATFORM_ENGINEER.search(title) and _COMPILER_CONTEXT.search(title):
        return True
    return False
