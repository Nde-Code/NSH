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

OK = f"{GREEN}✓{RESET}"
KO = f"{RED}✗{RESET}"
STEP = f"{BLUE}>{RESET}"
INFO = f"{PURPLE}i{RESET}"

def print_step(text: str):
    print(f"{STEP} {text}")


def print_result(label: str, resp: requests.Response,success_codes=(200, 201, 204, 301, 302)) -> bool:

    ok = resp.status_code in success_codes
    icon = OK if ok else KO
    color = GREEN if ok else RED

    print(f"{icon} {label}")
    print(f"    status: {color}{resp.status_code}{RESET}")

    try:
        body = resp.json()
        print(f"    body: {GRAY}{body}{RESET}")
    except Exception:
        if resp.text:
            print(f"    body: {GRAY}{resp.text}{RESET}")

    return ok


def load_env_file(path: Path) -> dict:

    env = {}

    with open(path, "r") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" not in line:
                continue

            key, value = line.split("=", 1)
            value = value.strip()

            if value.startswith('"') and value.endswith('"'):
                value = value[1:-1]
            elif value.startswith("'") and value.endswith("'"):
                value = value[1:-1]

            env[key.strip()] = value

    return env

def sleep_delay(delay: int):
    print(f"\n{INFO} Sleeping {delay}s...\n")
    time.sleep(delay)

def print_response(resp: requests.Response, max_body_len: int = 500):
    
    status = resp.status_code
    ok = 200 <= status < 300 or status in (301, 302)

    print(f"    status      : {status} ({'OK' if ok else 'ERROR'})")
    print(f"    content-type: {resp.headers.get('Content-Type', 'unknown')}")

    try:
        body = resp.json()
        body_str = str(body)
        if len(body_str) > max_body_len:
            body_str = body_str[:max_body_len] + "…"
        print(f"    body (json) : {body_str}")
    except Exception:
        text = resp.text.strip()
        if len(text) > max_body_len:
            text = text[:max_body_len] + "…"
        if text:
            print(f"    body (text) : {text}")
        else:
            print(f"    body        : <empty>")

def make_invalid_link(link: str) -> str:
    return "ht!tp://" + link.replace("://", "").replace("/", "_")

def main():

    parser = argparse.ArgumentParser(description="End-to-end API test CLI")

    parser.add_argument("--env", required=True, help="Env file path (ADMIN_KEY)")
    parser.add_argument("--link", required=True, help="Base long URL used for all tests")
    parser.add_argument("--delay", type=int, default=2, help="Delay between calls (1–10s)")
    parser.add_argument("--remote", help="Remote worker URL")

    args = parser.parse_args()
    delay = max(1, min(10, args.delay))

    env_path = Path(args.env)

    if not env_path.exists():
        print(f"{KO} Env file not found.")
        sys.exit(1)

    env = load_env_file(env_path)
    ADMIN_KEY = env.get("ADMIN_KEY")

    if not ADMIN_KEY:
        print(f"{KO} ADMIN_KEY missing in env file.")
        sys.exit(1)

    BASE_URL = args.remote.rstrip("/") if args.remote else "http://localhost:8787"

    if args.remote and not args.remote.startswith(("http://", "https://")):
        print(f"{KO} --remote must start with http:// or https://")
        sys.exit(1)

    print(f"{INFO} Target API: {BASE_URL} \n")

    admin_headers = {"Authorization": f"Bearer {ADMIN_KEY}", "Content-Type": "application/json"}

    created_id = None
    valid_link = args.link
    invalid_link = make_invalid_link(args.link)

    print_step("Fetching initial list of URLs:")
    r = requests.get(f"{BASE_URL}/urls?count=5", headers=admin_headers)
    print_result("GET /urls via request:", r)
    sleep_delay(delay)

    print_step("Creating short URL from valid link:")
    r = requests.post(f"{BASE_URL}/post-url", json={"long_url": valid_link})
    if print_result("POST /post-url (valid) via request:", r):
        try:
            body = r.json()
            created_id = next(iter(body.values())).split("/")[-1]
            print(f"    {INFO} Created ID: {created_id}")
        except Exception:
            print(f"    {INFO} Could not extract created ID")

    sleep_delay(delay)

    print_step("Testing URL validation with invalid link")
    r = requests.post(f"{BASE_URL}/post-url", json={"long_url": invalid_link})
    print_result("POST /post-url (invalid) via request:", r)
    sleep_delay(delay)

    if created_id:
        print_step("Resolving short URL:")
        r = requests.get(f"{BASE_URL}/url/{created_id}", allow_redirects=False)
        print_result("GET /url/{id} via request:", r)
        sleep_delay(delay)

    if created_id:
        print_step("Verifying short URL:")
        r = requests.patch(f"{BASE_URL}/verify/{created_id}", headers=admin_headers)
        print_result("PATCH /verify/{id} via request:", r)
        sleep_delay(delay)

    if created_id:
        print_step("Deleting short URL")
        r = requests.delete(f"{BASE_URL}/delete/{created_id}", headers=admin_headers)
        print_result("DELETE /delete/{id} via request:", r)
        sleep_delay(delay)

    print_step("Fetching final list of URLs after cleanup:")
    r = requests.get(f"{BASE_URL}/urls?count=5", headers=admin_headers)
    print_result("GET /urls (final) via request:", r)

    print(f"\n{OK} API test sequence completed successfully !")

if __name__ == "__main__":
    main()
