"""Fetch startup job boards and write data/jobs.json.

Sources that fail or cannot be parsed keep their previous listings.
A successful fetch replaces that source's listings.
"""

import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from http.cookiejar import CookieJar
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from job_filter import company_denied, company_too_big, is_ai_infra_engineering

ROOT = Path(__file__).resolve().parents[1]
SOURCES_PATH = ROOT / "data" / "sources.json"
JOBS_PATH = ROOT / "data" / "jobs.json"
USER_AGENT = "becoming-inference-engineer-job-board"
PAUSE_SECONDS = 0.15
MAX_PAGES = 30
ATS_HOSTS = (
    "greenhouse.io",
    "ashbyhq.com",
    "lever.co",
    "myworkdayjobs.com",
    "smartrecruiters.com",
)
YC_HOSTS = ("workatastartup.com", "ycombinator.com")
STARTUP_SIZES = ["2-10", "11-50", "51-200", "201-500", "501-1K"]
CONSIDER_DEPARTMENTS = ["Engineering", "Research", "Machine Learning"]


class SourceFailure(Exception):
    pass


def pause():
    time.sleep(PAUSE_SECONDS)


def request(url, data=None, headers=None, opener=None, timeout=30):
    hdrs = {"User-Agent": USER_AGENT}
    if headers:
        hdrs.update(headers)
    req = urllib.request.Request(url, data=data, headers=hdrs)
    open_fn = opener.open if opener else urllib.request.urlopen
    last_error = None
    for attempt in range(2):
        try:
            with open_fn(req, timeout=timeout) as response:
                return response.read()
        except (urllib.error.URLError, TimeoutError) as error:
            last_error = error
            if attempt == 0:
                pause()
                continue
            raise SourceFailure(str(error)) from error
    raise SourceFailure(str(last_error))


def request_json(url, payload=None, headers=None, opener=None):
    data = None
    hdrs = dict(headers or {})
    if payload is not None:
        data = json.dumps(payload).encode()
        hdrs.setdefault("Content-Type", "application/json")
        hdrs.setdefault("Accept", "application/json")
    raw = request(url, data=data, headers=hdrs, opener=opener)
    try:
        return json.loads(raw.decode("utf-8"))
    except json.JSONDecodeError as error:
        raise SourceFailure("response was not JSON") from error


def location_text(locations, fallback=""):
    if isinstance(locations, str):
        return locations.strip()
    if not locations:
        return fallback or ""
    names = [str(item).strip() for item in locations if str(item).strip()]
    if not names:
        return fallback or ""
    text = ", ".join(names[:2])
    extra = len(names) - 2
    if extra > 0:
        text += f" +{extra}"
    return text


def staff_count_value(value):
    if isinstance(value, bool) or value is None or isinstance(value, str):
        if isinstance(value, str) and value.isdigit():
            return int(value)
        return None
    if isinstance(value, (int, float)):
        return int(value)
    return None


def listing(source, source_job_id, title, company, url, locations, band=None, staff_count=None):
    if not url or not str(url).startswith("http"):
        return None
    headcount = staff_count_value(staff_count)
    if company_denied(company) or company_too_big(band) or (headcount is not None and headcount >= 1000):
        return None
    if not is_ai_infra_engineering(title):
        return None
    return {
        "id": f"{source}:{source_job_id}",
        "title": " ".join(title.split()),
        "company": " ".join(company.split()),
        "location": location_text(locations),
        "url": url,
        "source": source,
    }


def fetch_yc(name, queries):
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    html = request("https://www.workatastartup.com/jobs", opener=opener).decode("utf-8", "replace")
    match = re.search(r'name="csrf-token" content="([^"]+)"', html)
    if not match:
        raise SourceFailure("YC page had no CSRF token")
    found = {}
    for query in queries:
        pause()
        url = "https://www.workatastartup.com/jobs/search?q=" + urllib.parse.quote(query)
        payload = request_json(
            url,
            headers={
                "Accept": "application/json",
                "X-CSRF-Token": match.group(1),
                "X-Requested-With": "XMLHttpRequest",
                "Referer": "https://www.workatastartup.com/jobs",
            },
            opener=opener,
        )
        for job in payload.get("jobs") or []:
            item = listing(
                name,
                job.get("id"),
                job.get("title") or "",
                job.get("companyName") or "",
                job.get("applyUrl") or "",
                job.get("location") or "",
            )
            if item:
                found[item["id"]] = item
    return list(found.values())


def getro_network_id(html):
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        html,
    )
    if not match:
        return None
    try:
        data = json.loads(match.group(1))
    except json.JSONDecodeError:
        return None
    network = (data.get("props") or {}).get("pageProps", {}).get("network") or {}
    return network.get("id")


def fetch_getro(name, url, queries):
    html = request(url).decode("utf-8", "replace")
    network_id = getro_network_id(html)
    if not network_id:
        raise SourceFailure("Getro network id was not on the page")
    endpoint = f"https://api.getro.com/api/v2/collections/{network_id}/search/jobs"
    found = {}
    for query in queries:
        page = 0
        while page < MAX_PAGES:
            pause()
            payload = request_json(
                endpoint,
                {"hitsPerPage": 100, "page": page, "query": query},
            )
            results = payload.get("results") or {}
            jobs = results.get("jobs") or []
            total = results.get("count") or 0
            for job in jobs:
                org = job.get("organization") or {}
                item = listing(
                    name,
                    job.get("id"),
                    job.get("title") or "",
                    org.get("name") or "",
                    job.get("url") or "",
                    job.get("locations") or [],
                )
                if item:
                    found[item["id"]] = item
            page += 1
            if not jobs or page * 20 >= total:
                break
    return list(found.values())


def portfolio_action_id(page_url, html):
    sources = re.findall(r'(?:src|href)="(/_next/static/[^"]+\.js)"', html)
    pattern = re.compile(
        r'createServerReference\)\("([0-9a-f]+)"[^"]*"loadMorePublicJobs"'
    )
    for source in sources:
        script = request(urllib.parse.urljoin(page_url, source)).decode("utf-8", "replace")
        match = pattern.search(script)
        if match:
            return match.group(1)
    return None


def fetch_portfolio(name, url):
    html = request(url).decode("utf-8", "replace")
    action_id = portfolio_action_id(url, html)
    if not action_id:
        return None
    found = {}
    page = 0
    filters = {"roles": ["engineering"], "companySizes": STARTUP_SIZES}
    while page < MAX_PAGES:
        pause()
        raw = request(
            url,
            data=json.dumps([filters, {"page": page, "limit": 100}]).encode(),
            headers={
                "Next-Action": action_id,
                "Content-Type": "text/plain;charset=UTF-8",
                "Accept": "text/x-component",
            },
        ).decode("utf-8", "replace")
        marker = raw.find('{"jobs":')
        if marker < 0:
            raise SourceFailure("portfolio response had no jobs")
        payload, _ = json.JSONDecoder().raw_decode(raw[marker:])
        jobs = payload.get("jobs") or []
        for job in jobs:
            item = listing(
                name,
                job.get("id"),
                job.get("title") or "",
                job.get("company_name") or "",
                job.get("apply_url") or "",
                job.get("locations") or job.get("location") or "",
                band=job.get("company_band"),
            )
            if item:
                found[item["id"]] = item
        page += 1
        if payload.get("isDone") or not jobs:
            break
    else:
        raise SourceFailure("portfolio board exceeded the page cap")
    return list(found.values())


def fetch_consider(name, url):
    jar = CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    html = request(url, opener=opener).decode("utf-8", "replace")
    match = re.search(r"window\.serverInitialData = (\{.*?\});\s*</script>", html, re.S)
    if not match:
        raise SourceFailure("Consider page had no board data")
    initial = json.loads(match.group(1))
    token = initial.get("csrfToken")
    board = initial.get("board") or {}
    if not token or not board.get("id"):
        raise SourceFailure("Consider page had no CSRF token")
    endpoint = urllib.parse.urljoin(url, "/api-boards/search-jobs")
    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-CSRF-Token": token,
        "Referer": url,
    }
    found = {}
    saw_jobs = False
    for department in CONSIDER_DEPARTMENTS:
        try:
            department_jobs = _consider_department(
                endpoint, headers, opener, board["id"], department
            )
        except SourceFailure:
            if department == "Engineering":
                raise
            continue
        if department_jobs:
            saw_jobs = True
        for job in department_jobs:
            item = listing(
                name,
                job.get("jobId"),
                job.get("title") or "",
                job.get("companyName") or "",
                job.get("applyUrl") or job.get("url") or "",
                job.get("locations") or [],
                staff_count=job.get("companyStaffCount"),
            )
            if item:
                found[item["id"]] = item
    if not saw_jobs:
        raise SourceFailure("Consider board returned no engineering jobs")
    return list(found.values())


def _consider_department(endpoint, headers, opener, board_id, department):
    found = []
    sequence = None
    pages = 0
    while pages < MAX_PAGES:
        pause()
        meta = {"size": 100}
        if sequence:
            meta["sequence"] = sequence
        payload = request_json(
            endpoint,
            {
                "meta": meta,
                "board": {"id": board_id, "isParent": True},
                "query": {"departments": [department]},
                "grouped": False,
            },
            headers=headers,
            opener=opener,
        )
        if payload.get("errors"):
            message = payload["errors"][0].get("message") or "Consider search failed"
            raise SourceFailure(message)
        jobs = payload.get("jobs") or []
        found.extend(jobs)
        sequence = (payload.get("meta") or {}).get("sequence")
        pages += 1
        if len(jobs) < 100 or not sequence:
            break
    else:
        raise SourceFailure(f"Consider department {department} exceeded the page cap")
    return found


def fetch_auto(name, url):
    html = request(url).decode("utf-8", "replace")
    if "window.serverInitialData" in html and "csrfToken" in html:
        return fetch_consider(name, url)
    if getro_network_id(html):
        queries = json.loads(SOURCES_PATH.read_text())["queries"]
        return fetch_getro(name, url, queries)
    if portfolio_action_id(url, html):
        return fetch_portfolio(name, url)
    return None


def apply_rank(url):
    lowered = url.lower()
    if any(host in lowered for host in ATS_HOSTS):
        return 3
    if any(host in lowered for host in YC_HOSTS):
        return 1
    return 2


def dedupe_key(job):
    company = re.sub(r"[^a-z0-9]+", " ", job["company"].lower()).strip()
    title = re.sub(r"[^a-z0-9]+", " ", job["title"].lower()).strip()
    return f"{company}|{title}"


def dedupe(jobs):
    chosen = {}
    for job in jobs:
        key = dedupe_key(job)
        current = chosen.get(key)
        if current is None or apply_rank(job["url"]) > apply_rank(current["url"]):
            chosen[key] = job
    return list(chosen.values())


def load_previous():
    if not JOBS_PATH.exists():
        return []
    try:
        return json.loads(JOBS_PATH.read_text()).get("jobs") or []
    except json.JSONDecodeError:
        return []


def main():
    config = json.loads(SOURCES_PATH.read_text())
    queries = config["queries"]
    previous = load_previous()
    collected = []
    status = {}

    print(f"fetch {config['yc']['name']}", flush=True)
    try:
        jobs = fetch_yc(config["yc"]["name"], queries)
        collected.extend(jobs)
        status[config["yc"]["name"]] = f"ok ({len(jobs)})"
        print(f"  {len(jobs)}", flush=True)
    except (SourceFailure, urllib.error.HTTPError, json.JSONDecodeError) as error:
        status[config["yc"]["name"]] = f"error: {error}"
        print(f"  failed: {error}", flush=True)

    for board in config["boards"]:
        name = board["name"]
        kind = board["kind"]
        print(f"fetch {name} ({kind})", flush=True)
        try:
            if kind == "getro":
                jobs = fetch_getro(name, board["url"], queries)
            elif kind == "portfolio":
                jobs = fetch_portfolio(name, board["url"])
                if jobs is None:
                    status[name] = "skipped: board loader not found"
                    print("  skipped", flush=True)
                    continue
            elif kind == "consider":
                jobs = fetch_consider(name, board["url"])
            elif kind == "auto":
                jobs = fetch_auto(name, board["url"])
                if jobs is None:
                    status[name] = "skipped: no public feed"
                    print("  skipped", flush=True)
                    continue
            else:
                status[name] = "skipped: unknown kind"
                print("  skipped", flush=True)
                continue
            collected.extend(jobs)
            status[name] = f"ok ({len(jobs)})"
            print(f"  {len(jobs)}", flush=True)
        except (SourceFailure, urllib.error.HTTPError, json.JSONDecodeError, KeyError) as error:
            status[name] = f"error: {error}"
            print(f"  failed: {error}", flush=True)

    for board in config.get("not_fetched") or []:
        status[board["name"]] = "not fetched: " + board["reason"]

    failed_sources = {
        name
        for name, detail in status.items()
        if detail.startswith("error") or detail.startswith("skipped")
    }
    retained = [job for job in previous if job.get("source") in failed_sources]
    jobs = dedupe(collected + retained)
    jobs.sort(key=lambda job: (job["company"].lower(), job["title"].lower(), job["id"]))
    document = {
        "updated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "source_status": status,
        "jobs": jobs,
    }
    temporary = JOBS_PATH.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(document, indent=2) + "\n")
    temporary.replace(JOBS_PATH)
    print(f"wrote {len(jobs)} jobs", flush=True)


if __name__ == "__main__":
    main()
