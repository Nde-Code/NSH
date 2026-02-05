#!/usr/bin/env python3
import argparse
import time
import requests
import sys
from pathlib import Path

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
    print(f"\n[INFO] Sleeping {delay}s...\n")
    time.sleep(delay)


def print_response(resp: requests.Response):
    print(f"→ Status: {resp.status_code}")
    try:
        print("→ Body:", resp.json())
    except Exception:
        print("→ Body:", resp.text)


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
        print("[ERROR] Env file not found.")
        sys.exit(1)

    env = load_env_file(env_path)
    ADMIN_KEY = env.get("ADMIN_KEY")

    if not ADMIN_KEY:
        print("[ERROR] ADMIN_KEY missing in env file.")
        sys.exit(1)

    BASE_URL = args.remote.rstrip("/") if args.remote else "http://localhost:8787"

    if args.remote and not args.remote.startswith(("http://", "https://")):
        print("[ERROR] --remote must start with http:// or https://")
        sys.exit(1)

    print(f"[INFO] Target API: {BASE_URL}")

    admin_headers = {
        "Authorization": f"Bearer {ADMIN_KEY}",
        "Content-Type": "application/json"
    }

    created_id = None
    valid_link = args.link
    invalid_link = make_invalid_link(args.link)

    print("\n=== GET /urls ===")
    r = requests.get(f"{BASE_URL}/urls?count=5", headers=admin_headers)
    print_response(r)
    sleep_delay(delay)

    print("=== POST /post-url (valid link) ===")
    r = requests.post(f"{BASE_URL}/post-url", json={"long_url": valid_link})
    print_response(r)

    if r.ok:
        try:
            body = r.json()
            created_id = next(iter(body.values())).split("/")[-1]
            print(f"[INFO] Created ID: {created_id}.")
        except Exception:
            print("[WARNING] Could not extract ID.")

    sleep_delay(delay)

    print("=== POST /post-url (invalid link) ===")
    r = requests.post(f"{BASE_URL}/post-url", json={"long_url": invalid_link})
    print_response(r)
    sleep_delay(delay)

    if created_id:
        print("=== GET /url/{id} ===")
        r = requests.get(f"{BASE_URL}/url/{created_id}", allow_redirects=False)
        print_response(r)
        sleep_delay(delay)

    if created_id:
        print("=== PATCH /verify/{id} ===")
        r = requests.patch(f"{BASE_URL}/verify/{created_id}", headers=admin_headers)
        print_response(r)
        sleep_delay(delay)

    if created_id:
        print("=== DELETE /delete/{id} ===")
        r = requests.delete(f"{BASE_URL}/delete/{created_id}", headers=admin_headers)
        print_response(r)
        sleep_delay(delay)

    print("=== GET /urls (final) ===")
    r = requests.get(f"{BASE_URL}/urls?count=5", headers=admin_headers)
    print_response(r)

    print("[INFO] Full API test completed.")


if __name__ == "__main__":
    main()
