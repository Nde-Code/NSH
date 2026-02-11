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
    
    if not ok:
        TESTS_PASSED = False
        log_fail(f"{label} (Expected {expected_codes}, got {status})")
    else:
        log_success(label)

    try:
        body = resp.json()
        if not ok:
            print(f"    Error detail: {body}")
        else:
            keys = list(body.keys())
            if len(keys) > 5:
                print(f"    Response: {len(keys)} items returned.")
            else:
                print(f"    Response keys: {keys}")
    except Exception:
        if not ok and resp.text:
            text = resp.text.strip().replace("\n", " ")
            print(f"    Body snippet: {text[:100]}...")
    return ok

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

    TIMEOUT = args.timeout

    def safe_request(method: str, url: str, **kwargs):
        headers = kwargs.get("headers", {}).copy()
        headers.setdefault("User-Agent", USER_AGENT)
        kwargs["headers"] = headers
        try:
            fn = getattr(requests, method)
            return fn(url, timeout=TIMEOUT, **kwargs)
        except Exception as e:
            r = requests.models.Response()
            r.status_code = 0
            r._content = str(e).encode()
            r.encoding = 'utf-8'
            return r

    log_info(f"Starting Robust CI Suite against {BASE_URL}")

    log_step("Security & Base")
    r = safe_request("get", f"{BASE_URL}/urls", headers=BAD_HEADERS)
    print_result("GET /urls with wrong key (Expect 401)", r, expected_codes=(401,))

    time.sleep(args.delay)
    r = safe_request("get", f"{BASE_URL}/")
    print_result("GET / (Expect 200)", r, expected_codes=(200,))
    print_result("OPTIONS /post-url (CORS - Expect 204)", safe_request("options", f"{BASE_URL}/post-url"), expected_codes=(204,))

    log_step("Rate Limiting")
    triggered = False
    for _ in range(5):
        r_rate = safe_request("get", f"{BASE_URL}/urls", headers=HEADERS)
        if r_rate.status_code == 429:
            triggered = True
            break
    
    if triggered:
        log_success("GET /urls rate limited (Got 429)")
    else:
        log_info("Rate limit not triggered (Check your RATE_LIMIT_INTERVAL_S)")

    time.sleep(args.delay + 1)

    log_step("POST Validation (Body & Length)")
    bad_payload = {"long_url": unique_test_link, "extra_field": "not_allowed"}
    r = safe_request("post", f"{BASE_URL}/post-url", json=bad_payload)
    print_result("POST with extra fields (Expect 400)", r, expected_codes=(400,))

    time.sleep(args.delay)
    
    long_url = "https://example.com/" + ("a" * (args.max_url_length + 1))
    r_long = safe_request("post", f"{BASE_URL}/post-url", json={"long_url": long_url})
    print_result("POST overlong URL > 2000 (Expect 400)", r_long, expected_codes=(400,))

    time.sleep(args.delay)

    log_step("POST Self-Shortening Loop Protection")
    self_payload = {"long_url": f"{BASE_URL}/url/some-id"}
    r = safe_request("post", f"{BASE_URL}/post-url", json=self_payload)
    print_result("POST with self-domain (Expect 400)", r, expected_codes=(400,))

    time.sleep(args.delay)

    exotic_urls = [
        f"{unique_test_link}café",
        f"{unique_test_link}🔥",
        f"{unique_test_link}chemin?query=é&emoji=😊"
    ]

    log_step("POST Exotic URLs")
    for url in exotic_urls:
        r = safe_request("post", f"{BASE_URL}/post-url", json={"long_url": url})
        print_result(f"POST exotic URL: {url}", r, expected_codes=(200, 201))
        if r.status_code in (200, 201):
            try:
                cid = r.json()["success"].split("/")[-1]
                created_ids.append(cid)
                r_get = safe_request("get", f"{BASE_URL}/url/{cid}", allow_redirects=False)
                print_result(f"GET exotic URL ID: {cid}", r_get, expected_codes=(301, 302))
            except Exception:
                log_info("Could not parse created ID from exotic URL response.")

    time.sleep(args.delay)

    log_step("POST Valid URL Creation")
    r = safe_request("post", f"{BASE_URL}/post-url", json={"long_url": unique_test_link})
    if print_result("POST /post-url (Expect 201/200)", r, expected_codes=(200, 201)):
        try:
            cid = r.json().get("success", "").split("/")[-1]
            created_ids.append(cid)
            log_info(f"Created ID: {cid}")
        except Exception:
            log_info("Could not parse created ID from response.")

    if created_ids:
        primary_id = created_ids[0]
        time.sleep(args.delay)
        log_step("URL Resolution & Robustness")
        r = safe_request("get", f"{BASE_URL}/url/{primary_id}", allow_redirects=False)
        print_result(f"GET /url/{primary_id} (Expect 301/302)", r, expected_codes=(301, 302))
        
        r_bad = safe_request("get", f"{BASE_URL}/url/bad@char!")
        print_result("GET malformed ID 'bad@char!' (Expect 400/404)", r_bad, expected_codes=(400, 404))

        time.sleep(args.delay)
        log_step("PATCH Verification Logic")
        print_result("First Verification", safe_request("patch", f"{BASE_URL}/verify/{primary_id}", headers=HEADERS), expected_codes=(200,))
        
        time.sleep(args.delay)
        print_result("PATCH non-existent ID (Expect 400/404)", safe_request("patch", f"{BASE_URL}/verify/no-id", headers=HEADERS), expected_codes=(400, 404))
        
        time.sleep(args.delay)
        print_result("Second Verification (Already verified)", safe_request("patch", f"{BASE_URL}/verify/{primary_id}", headers=HEADERS), expected_codes=(200,))

    time.sleep(args.delay)
    log_step("GET /urls Pagination & Limits")
    r_limit = safe_request("get", f"{BASE_URL}/urls?count=999", headers=HEADERS)
    print_result("GET /urls?count=999 (Abusive limit - Expect 400)", r_limit, expected_codes=(400,))

    time.sleep(args.delay)
    r = safe_request("get", f"{BASE_URL}/urls?count=1", headers=HEADERS)
    if print_result("GET /urls?count=1", r):
        try:
            data = r.json()
            if data.get("has_more") and data.get("next_cursor"):
                cursor = data["next_cursor"]
                time.sleep(args.delay + 1)
                print_result("GET /urls with cursor", safe_request("get", f"{BASE_URL}/urls?count=1&cursor={cursor}", headers=HEADERS))
        except Exception:
            print("    Could not parse /urls response JSON.")

    if created_ids:
        time.sleep(args.delay)
        log_step("DELETE Endpoints")
        unique_ids = list(dict.fromkeys(created_ids))
        for cid in unique_ids:
            time.sleep(args.delay)
            print_result(f"DELETE /delete/{cid}", safe_request("delete", f"{BASE_URL}/delete/{cid}", headers=HEADERS), expected_codes=(200,))
        
        time.sleep(args.delay)
        print_result("DELETE non-existent (Expect 400/404)", safe_request("delete", f"{BASE_URL}/delete/no-id", headers=HEADERS), expected_codes=(400, 404))

    log_step("Invalid Endpoint")
    print_result("GET /random (Expect 404)", safe_request("get", f"{BASE_URL}/not-here", headers=HEADERS), expected_codes=(404,))

    if TESTS_PASSED:
        print(f"\n[RESULT] SUCCESS: Full suite passed at {time.strftime('%H:%M:%S')}")
        sys.exit(0)
    else:
        print(f"\n[RESULT] FAILURE: Some tests failed. Check logs above.")
        sys.exit(1)

if __name__ == "__main__":
    main()
