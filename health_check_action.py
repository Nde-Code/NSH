#!/usr/bin/env python3
import argparse
import time
import requests
import sys
import os

def log_info(msg): print(f"[INFO] {msg}")
def log_step(msg): print(f"\n[TEST]: {msg} ")
def log_success(msg): print(f"[PASS] {msg}")
def log_fail(msg): print(f"[FAIL] {msg}")

TESTS_PASSED = True

def print_result(label: str, resp: requests.Response, expected_codes=(200, 201, 204, 301, 302)) -> bool:
    global TESTS_PASSED

    status = resp.status_code
    ok = status in expected_codes

    if ok:
        log_success(label)
    else:
        TESTS_PASSED = False
        log_fail(f"{label} (Expected {expected_codes}, got {status})")

    try:
        body = resp.json()
        if not ok:
            print(f"    Error detail: {body}")
        else:
            keys = list(body.keys()) if isinstance(body, dict) else []
            if keys:
                if len(keys) > 5:
                    print(f"    Response: {len(keys)} items returned.")
                else:
                    print(f"    Response keys: {keys}")
    except Exception:
        if not ok and resp.text:
            text = resp.text.strip().replace("\n", " ")
            print(f"    Body snippet: {text[:25]}...")

    return ok


def make_safe_request(timeout: int, user_agent: str):

    session = requests.Session()

    def safe_request(method: str, url: str, **kwargs):
        headers = kwargs.get("headers", {}).copy()
        headers.setdefault("User-Agent", user_agent)
        kwargs["headers"] = headers

        try:
            return session.request(method, url, timeout=timeout, **kwargs)
        except Exception as exc:  
            r = requests.models.Response()
            r.status_code = 0
            r._content = str(exc).encode()
            r.encoding = "utf-8"
            return r

    return safe_request

def test_security_and_base(base_url: str, safe_request, bad_headers: dict) -> None:
    log_step("Security & Base")
    r = safe_request("get", f"{base_url}/urls", headers=bad_headers)
    print_result("GET /urls with wrong key (Expect 401)", r, expected_codes=(401,))

    time.sleep(1)
    r = safe_request("get", f"{base_url}/")
    print_result("GET / (Expect 200)", r, expected_codes=(200,))
    print_result("OPTIONS /post-url (CORS - Expect 204)", safe_request("options", f"{base_url}/post-url"), expected_codes=(204,))


def test_favicon(base_url: str, safe_request, expected_codes=(200, 204, 301, 302)) -> None:
    """Simple check for the presence (or redirect) of /favicon.ico."""
    log_step("GET /favicon.ico")
    r = safe_request("get", f"{base_url}/favicon.ico", allow_redirects=False)
    print_result("GET /favicon.ico (Expect 200/204/301/302)", r, expected_codes=expected_codes)


def test_rate_limiting(base_url: str, safe_request, headers: dict) -> None:
    log_step("Rate Limiting")
    triggered = False
    for _ in range(5):
        r_rate = safe_request("get", f"{base_url}/urls", headers=headers)
        if r_rate.status_code == 429:
            triggered = True
            break

    if triggered:
        log_success("GET /urls rate limited (Got 429)")
    else:
        log_info("Rate limit not triggered (Check your RATE_LIMIT_INTERVAL_S)")


def test_post_validation(base_url: str, safe_request, unique_test_link: str, max_len: int) -> None:
    log_step("POST Validation (Body & Length)")
    bad_payload = {"long_url": unique_test_link, "extra_field": "not_allowed"}
    r = safe_request("post", f"{base_url}/post-url", json=bad_payload)
    print_result("POST with extra fields (Expect 400)", r, expected_codes=(400,))

    time.sleep(1)
    long_url = "https://example.com/" + ("a" * (max_len + 1))
    r_long = safe_request("post", f"{base_url}/post-url", json={"long_url": long_url})
    print_result("POST overlong URL > 2000 (Expect 400)", r_long, expected_codes=(400,))

    time.sleep(1)
    self_payload = {"long_url": f"{base_url}/url/some-id"}
    r = safe_request("post", f"{base_url}/post-url", json=self_payload)
    print_result("POST with self-domain (Expect 400)", r, expected_codes=(400,))


def test_exotic_urls(base_url: str, safe_request, unique_test_link: str, created_ids: list) -> None:
    log_step("POST Exotic URLs")
    exotic_urls = [
        f"{unique_test_link}café",
        f"{unique_test_link}🔥",
        f"{unique_test_link}chemin?query=é&emoji=😊",
    ]

    for url in exotic_urls:
        r = safe_request("post", f"{base_url}/post-url", json={"long_url": url})
        print_result(f"POST exotic URL: {url}", r, expected_codes=(200, 201))
        time.sleep(1)
        if r.status_code in (200, 201):
            try:
                cid = r.json().get("success", "").split("/")[-1]
                created_ids.append(cid)
                r_get = safe_request("get", f"{base_url}/url/{cid}", allow_redirects=False)
                print_result(f"GET exotic URL ID: {cid}", r_get, expected_codes=(301, 302))
            except Exception:
                log_info("Could not parse created ID from exotic URL response.")


def test_creation_and_verification(base_url: str, safe_request, unique_test_link: str, created_ids: list, headers: dict) -> None:
    log_step("POST Valid URL Creation")
    r = safe_request("post", f"{base_url}/post-url", json={"long_url": unique_test_link})
    if print_result("POST /post-url (Expect 201/200)", r, expected_codes=(200, 201)):
        try:
            cid = r.json().get("success", "").split("/")[-1]
            created_ids.append(cid)
            log_info(f"Created ID: {cid}")
        except Exception:
            log_info("Could not parse created ID from response.")

    if created_ids:
        primary_id = created_ids[0]
        time.sleep(1)
        log_step("URL Resolution & Robustness")
        r = safe_request("get", f"{base_url}/url/{primary_id}", allow_redirects=False)
        print_result(f"GET /url/{primary_id} (Expect 301/302)", r, expected_codes=(301, 302))

        r_bad = safe_request("get", f"{base_url}/url/bad@char!")
        print_result("GET malformed ID 'bad@char!' (Expect 400/404)", r_bad, expected_codes=(400, 404))

        time.sleep(1)
        log_step("PATCH Verification Logic")
        print_result("First Verification", safe_request("patch", f"{base_url}/verify/{primary_id}", headers=headers), expected_codes=(200,))

        time.sleep(1)
        print_result("PATCH non-existent ID (Expect 400/404)", safe_request("patch", f"{base_url}/verify/no-id", headers=headers), expected_codes=(400, 404))

        time.sleep(1)
        print_result("Second Verification (Already verified)", safe_request("patch", f"{base_url}/verify/{primary_id}", headers=headers), expected_codes=(200,))


def test_pagination_and_limits(base_url: str, safe_request, headers: dict) -> None:
    log_step("GET /urls Pagination & Limits")
    r_limit = safe_request("get", f"{base_url}/urls?count=999", headers=headers)
    print_result("GET /urls?count=999 (Abusive limit - Expect 400)", r_limit, expected_codes=(400,))

    time.sleep(1)
    r = safe_request("get", f"{base_url}/urls?count=1", headers=headers)
    if print_result("GET /urls?count=1", r):
        try:
            data = r.json()
            if data.get("has_more") and data.get("next_cursor"):
                cursor = data["next_cursor"]
                time.sleep(1)
                print_result("GET /urls with cursor", safe_request("get", f"{base_url}/urls?count=1&cursor={cursor}", headers=headers))
        except Exception:
            print("    Could not parse /urls response JSON.")


def test_delete_endpoints(base_url: str, safe_request, created_ids: list, headers: dict) -> None:
    if not created_ids:
        return

    time.sleep(1)
    log_step("DELETE Endpoints")
    unique_ids = list(dict.fromkeys(created_ids))
    for cid in unique_ids:
        time.sleep(1)
        print_result(f"DELETE /delete/{cid}", safe_request("delete", f"{base_url}/delete/{cid}", headers=headers), expected_codes=(200,))

    time.sleep(1)
    print_result("DELETE non-existent (Expect 400/404)", safe_request("delete", f"{base_url}/delete/no-id", headers=headers), expected_codes=(400, 404))


def test_invalid_endpoint(base_url: str, safe_request, headers: dict) -> None:
    log_step("Invalid Endpoint")
    print_result("GET /random (Expect 404)", safe_request("get", f"{base_url}/not-here", headers=headers), expected_codes=(404,))

def main():
    parser = argparse.ArgumentParser(description="Full API CI Suite - Robust Version")
    parser.add_argument("--link", required=True, help="Long URL to use for tests")
    parser.add_argument("--remote", required=True, help="Remote worker URL")
    parser.add_argument("--delay", type=int, default=1, help="Delay between calls")
    parser.add_argument("--max-url-length", type=int, default=2000, help="Max URL length to test against")
    parser.add_argument("--timeout", type=int, default=10, help="Request timeout in seconds")
    args = parser.parse_args()

    ADMIN_KEY = os.getenv("ADMIN_KEY")
    if not ADMIN_KEY:
        log_fail("ADMIN_KEY environment variable is missing.")
        sys.exit(1)

    BASE_URL = args.remote.rstrip("/")
    USER_AGENT = "NSH-Health-Check/1.0 (triggered-by: GitHub Actions weekly; repo: Nde-Code/NSH)"

    HEADERS = {"Authorization": f"Bearer {ADMIN_KEY}", "Content-Type": "application/json", "User-Agent": USER_AGENT}
    BAD_HEADERS = {"Authorization": "Bearer WRONG_KEY", "Content-Type": "application/json", "User-Agent": USER_AGENT}

    unique_test_link = f"{args.link}?ci_run={int(time.time())}"
    created_ids = []

    safe_request = make_safe_request(timeout=args.timeout, user_agent=USER_AGENT)

    log_info(f"Starting Robust CI Suite against {BASE_URL}")

    test_security_and_base(BASE_URL, safe_request, BAD_HEADERS)

    time.sleep(args.delay)
    test_favicon(BASE_URL, safe_request)

    time.sleep(args.delay)
    test_rate_limiting(BASE_URL, safe_request, HEADERS)

    time.sleep(args.delay)
    test_post_validation(BASE_URL, safe_request, unique_test_link, args.max_url_length)

    time.sleep(args.delay)
    test_exotic_urls(BASE_URL, safe_request, unique_test_link, created_ids)

    time.sleep(args.delay)
    test_creation_and_verification(BASE_URL, safe_request, unique_test_link, created_ids, HEADERS)

    time.sleep(args.delay)
    test_pagination_and_limits(BASE_URL, safe_request, HEADERS)

    time.sleep(args.delay)
    test_delete_endpoints(BASE_URL, safe_request, created_ids, HEADERS)

    time.sleep(args.delay)
    test_invalid_endpoint(BASE_URL, safe_request, HEADERS)

    if TESTS_PASSED:
        print(f"\n[RESULT] SUCCESS: Full suite passed at {time.strftime('%H:%M:%S')}")
        sys.exit(0)
    else:
        print(f"\n[RESULT] FAILURE: Some tests failed. Check logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()