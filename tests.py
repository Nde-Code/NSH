#!/usr/bin/env python3
import argparse
import time
import requests
import sys
from pathlib import Path

RESET = "\033[0m"
GREEN = "\033[32m"
RED = "\033[31m"
BLUE = "\033[36m"
PURPLE = "\033[35m"
GRAY = "\033[90m"
YELLOW = "\033[33m"

OK = f"{GREEN}✓{RESET}"
KO = f"{RED}✗{RESET}"
STEP = f"{BLUE}>>>{RESET}"
INFO = f"{PURPLE}i{RESET}"
WARN = f"{YELLOW}!{RESET}"

def print_step(text: str): print(f"\n{STEP} {text}")

def print_result(label: str, resp: requests.Response, expected_codes=(200, 201, 204, 301, 302)) -> bool:

    status = resp.status_code
    ok = status in expected_codes
    icon = OK if ok else KO
    color = GREEN if ok else RED

    print(f"{icon} {label}")
    print(f"    status: {color}{status}{RESET}")

    try:

        body = resp.json()
        print(f"    body: {GRAY}{body}{RESET}")

    except Exception:

        if resp.text:
            text = resp.text.strip().replace("\n", " ")
            print(f"    body: {GRAY}{text[:100]}{'...' if len(text)>100 else ''}{RESET}")

    return ok

def load_env_file(path: Path) -> dict:

    env = {}

    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            env[key.strip()] = value.strip().strip("'").strip('"')

    return env

def sleep_delay(delay: int, reason: str = "Rate limit spacing"):
    print(f"    {GRAY}({reason}: sleeping {delay}s...){RESET}")
    time.sleep(delay)

def main():

    parser = argparse.ArgumentParser(description="Full API Suite Test")
    parser.add_argument("--env", required=True, help="Path to .env (must contain ADMIN_KEY)")
    parser.add_argument("--link", required=True, help="Long URL to use for tests")
    parser.add_argument("--delay", type=int, default=2, help="Delay between calls")
    parser.add_argument("--remote", help="Remote worker URL (default: http://localhost:8787)")

    args = parser.parse_args()

    env = load_env_file(Path(args.env))
    ADMIN_KEY = env.get("ADMIN_KEY")
    
    if not ADMIN_KEY:
        print(f"{KO} Error: ADMIN_KEY not found in env file.")
        sys.exit(1)

    BASE_URL = args.remote.rstrip("/") if args.remote else "http://localhost:8787"
    HEADERS = {"Authorization": f"Bearer {ADMIN_KEY}", "Content-Type": "application/json"}
    BAD_HEADERS = {"Authorization": "Bearer WRONG_KEY", "Content-Type": "application/json"}
    
    created_id = None

    print(f"\n{INFO} Starting API test suite against {BASE_URL} at {time.strftime('%H:%M:%S')}")

    print_step("TEST: Security / Unauthorized Access")
    r = requests.get(f"{BASE_URL}/urls", headers=BAD_HEADERS)
    print_result("GET /urls with wrong key (Expect 401)", r, expected_codes=(401,))

    sleep_delay(args.delay)

    print_step("TEST: Rate Limiting (Spamming)")
    requests.get(f"{BASE_URL}/urls", headers=HEADERS) 
    r = requests.get(f"{BASE_URL}/urls", headers=HEADERS) 
    print_result("GET /urls immediate repeat (Expect 429)", r, expected_codes=(429,))

    sleep_delay(args.delay + 1, "Waiting for rate limit to reset")

    print_step("TEST: POST Strict Body Validation")
    bad_payload = {"long_url": args.link, "extra_field": "not_allowed"}
    r = requests.post(f"{BASE_URL}/post-url", json=bad_payload)
    print_result("POST /post-url with extra fields (Expect 400)", r, expected_codes=(400,))

    sleep_delay(args.delay)

    print_step("TEST: POST Valid URL Creation")
    r = requests.post(f"{BASE_URL}/post-url", json={"long_url": args.link})
    if print_result("POST /post-url (Expect 201 or 200)", r, expected_codes=(200, 201)):
        body = r.json()
        url_val = body.get("success", "")
        created_id = url_val.split("/")[-1]
        print(f"    {INFO} Created ID: {YELLOW}{created_id}{RESET}")

    sleep_delay(args.delay)

    if created_id:
        print_step("TEST: GET URL Resolution")
        r = requests.get(f"{BASE_URL}/url/{created_id}", allow_redirects=False)
        print_result(f"GET /url/{created_id} (Expect 301/302)", r, expected_codes=(301, 302))
        
    if created_id:
        print_step("TEST: PATCH Verification Logic")
        r1 = requests.patch(f"{BASE_URL}/verify/{created_id}", headers=HEADERS)
        print_result("First Verification (Expect 200 'verified_now')", r1)
        
        sleep_delay(args.delay)
        
        r2 = requests.patch(f"{BASE_URL}/verify/{created_id}", headers=HEADERS)
        print_result("Second Verification (Expect 200 'already_verified')", r2)

    sleep_delay(args.delay)

    print_step("TEST: GET /urls Pagination")
    r = requests.get(f"{BASE_URL}/urls?count=1", headers=HEADERS)
    if print_result("GET /urls?count=1", r):
        data = r.json()
        if data.get("has_more") and data.get("next_cursor"):
            cursor = data["next_cursor"]
            print(f"    {INFO} Fetching next page with cursor: {cursor}")
            sleep_delay(args.delay + 1, "Extra safety for pagination")
            r_page2 = requests.get(f"{BASE_URL}/urls?count=1&cursor={cursor}", headers=HEADERS)
            print_result("GET /urls with cursor (Expect 200)", r_page2)

    sleep_delay(args.delay)

    if created_id:
        print_step("TEST: DELETE Endpoints")
        r = requests.delete(f"{BASE_URL}/delete/{created_id}", headers=HEADERS)
        print_result(f"DELETE /delete/{created_id} (Expect 200)", r)
        
        sleep_delay(args.delay)
        
        r_repeat = requests.delete(f"{BASE_URL}/delete/{created_id}", headers=HEADERS)
        print_result("DELETE non-existent ID (Expect 404)", r_repeat, expected_codes=(404,))

    print_step("TEST: Invalid Endpoint")
    r = requests.get(f"{BASE_URL}/this-endpoint-does-not-exist", headers=HEADERS)
    print_result("GET /random (Expect 404)", r, expected_codes=(404,))

    print(f"\n{INFO} Full test suite completed at {time.strftime('%H:%M:%S')}")

if __name__ == "__main__": main()