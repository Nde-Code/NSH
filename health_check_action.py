#!/usr/bin/env python3
import argparse
import time
import requests
import sys
import os

class APITestSuite:

    def __init__(self, args, admin_key):
        self.args = args
        self.admin_key = admin_key
        self.tests_passed = True
        
        self.base_url = args.remote.rstrip("/")
        self.user_agent = "NSH-Health-Check/1.0 (triggered-by: GitHub Actions weekly; repo: Nde-Code/NSH)"
        self.headers = {"Authorization": f"Bearer {self.admin_key}", "Content-Type": "application/json", "User-Agent": self.user_agent}
        self.bad_headers = {"Authorization": "Bearer WRONG_KEY", "Content-Type": "application/json", "User-Agent": self.user_agent}
        self.unique_test_link = f"{args.link}?ci_run={int(time.time())}"
        
        self.created_ids = []
        self.session = requests.Session()
    
    @staticmethod
    def log_info(msg): 
        print(f"[INFO] {msg}")
        
    @staticmethod
    def log_step(msg): 
        print(f"\n[TEST]: {msg} ")
        
    @staticmethod
    def log_success(msg): 
        print(f"[PASS] {msg}")
        
    @staticmethod
    def log_fail(msg): 
        print(f"[FAIL] {msg}")

    def print_result(self, label: str, resp: requests.Response, expected_codes=(200, 201, 204, 301, 302)) -> bool:
        status = resp.status_code
        ok = status in expected_codes

        if ok:
            self.log_success(label)
        else:
            self.tests_passed = False
            self.log_fail(f"{label} (Expected {expected_codes}, got {status})")

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

    def safe_request(self, method: str, url: str, **kwargs):
        headers = kwargs.get("headers", {}).copy()
        headers.setdefault("User-Agent", self.user_agent)
        kwargs["headers"] = headers

        try:
            return self.session.request(method, url, timeout=self.args.timeout, **kwargs)
        except Exception as exc:  
            r = requests.models.Response()
            r.status_code = 0
            r._content = b'{"error": "request_failed", "detail": "' + str(exc).encode() + b'"}'
            r.encoding = "utf-8"
            return r

    def run_test(self, name: str, test_func):
        self.log_step(name)
        test_func()
        time.sleep(self.args.delay)


    def test_security_and_base(self):
        r = self.safe_request("get", f"{self.base_url}/urls", headers=self.bad_headers)
        self.print_result("GET /urls with wrong key (Expect 401)", r, expected_codes=(401,))

        time.sleep(self.args.delay)

        r = self.safe_request("get", f"{self.base_url}/")
        self.print_result("GET / (Expect 200)", r, expected_codes=(200,))

        r_options = self.safe_request("options", f"{self.base_url}/post-url")
        self.print_result("OPTIONS /post-url (CORS - Expect 204)", r_options, expected_codes=(204,))

        try:
            if r_options.status_code == 204:
                acao = r_options.headers.get("Access-Control-Allow-Origin")
                acam = r_options.headers.get("Access-Control-Allow-Methods")
                acah = r_options.headers.get("Access-Control-Allow-Headers")
                if acao and acam and acah and "Content-Type" in acah:
                    self.log_success("OPTIONS response contains required CORS headers")
                else:
                    self.log_fail("OPTIONS missing required CORS headers")
        except Exception:
            self.log_info("Could not verify OPTIONS headers")

        time.sleep(self.args.delay)
        if self.admin_key:
            r_x = self.safe_request("get", f"{self.base_url}/urls", headers={"x-api-key": self.admin_key})
            self.print_result("GET /urls with x-api-key (Expect 200)", r_x, expected_codes=(200,))
        else:
            self.log_info("ADMIN_KEY not set; skipping x-api-key test")

    def test_favicon(self):
        r = self.safe_request("get", f"{self.base_url}/favicon.ico", allow_redirects=False)
        self.print_result("GET /favicon.ico (Expect 200/204/301/302)", r, expected_codes=(200, 204, 301, 302))

    def test_rate_limiting(self):
        triggered = False
        for _ in range(5):
            r_rate = self.safe_request("get", f"{self.base_url}/urls", headers=self.headers)
            if r_rate.status_code == 429:
                triggered = True
                break

        if triggered:
            self.log_success("GET /urls rate limited (Got 429)")
        else:
            self.log_info("Rate limit not triggered (Check your RATE_LIMIT_INTERVAL_S)")

        recovery_wait = (self.args.delay + 0.5)
        print(f"    Waiting {recovery_wait}s for rate limit to expire...")
        time.sleep(recovery_wait)
        
        r_recovery = self.safe_request("get", f"{self.base_url}/urls", headers=self.headers)
        
        if r_recovery.status_code != 429:
            self.log_success(f"Rate limit recovery successful (Got {r_recovery.status_code})")
        else:
            self.tests_passed = False
            self.log_fail(f"Recovery failed: Still getting 429 after {recovery_wait}s wait.")

    def test_post_validation(self):
        r_empty_url = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": ""})
        self.print_result("POST with empty long_url (Expect 400)", r_empty_url, expected_codes=(400,))
        
        time.sleep(self.args.delay)
        bad_payload = {"long_url": self.unique_test_link, "extra_field": "not_allowed"}
        r = self.safe_request("post", f"{self.base_url}/post-url", json=bad_payload)
        self.print_result("POST with extra fields (Expect 400)", r, expected_codes=(400,))

        time.sleep(self.args.delay)
        long_url = "https://example.com/" + ("a" * (self.args.max_url_length + 1))
        r_long = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": long_url})
        self.print_result("POST overlong URL > 2000 (Expect 400)", r_long, expected_codes=(400,))

        time.sleep(self.args.delay)
        self_payload = {"long_url": f"{self.base_url}/url/some-id"}
        r = self.safe_request("post", f"{self.base_url}/post-url", json=self_payload)
        self.print_result("POST with self-domain (Expect 400)", r, expected_codes=(400,))

        time.sleep(self.args.delay)
        raw_data = f'{{"long_url": "{self.unique_test_link}"}}'
        r_missing_ct = self.safe_request("post", f"{self.base_url}/post-url", data=raw_data)
        self.print_result("POST with missing application/json header (Expect 400)", r_missing_ct, expected_codes=(400,))

        time.sleep(self.args.delay)
        self.print_result("POST javascript: scheme (Expect 400)", self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": "javascript:alert(1)"}), expected_codes=(400,))

        time.sleep(self.args.delay)
        r_malformed = self.safe_request("post", f"{self.base_url}/post-url", data="{not: json}", headers={"Content-Type": "application/json"})
        self.print_result("POST with malformed JSON (Expect 400)", r_malformed, expected_codes=(400,))

        time.sleep(self.args.delay)
        r_empty = self.safe_request("post", f"{self.base_url}/post-url", data="", headers={"Content-Type": "application/json"})
        self.print_result("POST with empty JSON body (Expect 400)", r_empty, expected_codes=(400,))

        forbidden_cases = [
            ("ftp:// scheme", "ftp://example.com/resource"),
            ("localhost host", "http://localhost/path"),
            ("127.0.0.1 host", "http://127.0.0.1/path"),
            ("IPv6 localhost", "http://[::1]/path"),            
            ("Host without dot", "http://my-internal-server/"), 
            ("Trailing dot host", "http://example.com./")
        ]
        
        for label, bad_url in forbidden_cases:
            time.sleep(self.args.delay)
            r_bad = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": bad_url})
            self.print_result(f"POST with {label} (Expect 400)", r_bad, expected_codes=(400,))

    def test_exotic_urls(self):
        exotic_urls = [
            f"{self.unique_test_link}café",
            f"{self.unique_test_link}🔥",
            f"{self.unique_test_link}chemin?query=é&emoji=😊",
        ]

        for url in exotic_urls:
            r = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": url})
            self.print_result(f"POST exotic URL: {url}", r, expected_codes=(200, 201))
            time.sleep(self.args.delay)
            
            if r.status_code in (200, 201):
                try:
                    cid = r.json().get("success", "").split("/")[-1]
                    self.created_ids.append(cid)
                    r_get = self.safe_request("get", f"{self.base_url}/url/{cid}", allow_redirects=False)
                    self.print_result(f"GET exotic URL ID: {cid}", r_get, expected_codes=(301, 302))
                except Exception:
                    self.log_info("Could not parse created ID from exotic URL response.")

    def test_idempotency(self):
        r1 = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": self.unique_test_link}, headers=self.headers)
        if r1.status_code in (200, 201):
            id1 = r1.json().get("success", "").split("/")[-1]
            time.sleep(self.args.delay)
            
            r2 = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": self.unique_test_link}, headers=self.headers)
            self.print_result("POST duplicate URL (Expect 200/201)", r2, expected_codes=(200, 201))
            
            if r2.status_code in (200, 201):
                id2 = r2.json().get("success", "").split("/")[-1]
                if id1 == id2:
                    self.log_success(f"Idempotency verified: Both requests returned ID {id1}")
                else:
                    self.log_fail(f"Idempotency failed: Got {id1} then {id2}")

    def test_creation_and_verification(self):
        r = self.safe_request("post", f"{self.base_url}/post-url", json={"long_url": self.unique_test_link})
        if self.print_result("POST /post-url (Expect 201/200)", r, expected_codes=(200, 201)):
            try:
                cid = r.json().get("success", "").split("/")[-1]
                self.created_ids.append(cid)
                self.log_info(f"Created ID: {cid}")
            except Exception:
                self.log_info("Could not parse created ID from response.")

        if self.created_ids:
            primary_id = self.created_ids[0]
            time.sleep(self.args.delay)
            
            self.log_step("URL Resolution & Robustness")

            long_id = "a" * 100
            r_long_id = self.safe_request("get", f"{self.base_url}/url/{long_id}")
            self.print_result("GET with overlong ID (Expect 400/404)", r_long_id, expected_codes=(400, 404))

            time.sleep(self.args.delay)

            r = self.safe_request("get", f"{self.base_url}/url/{primary_id}", allow_redirects=False)
            self.print_result(f"GET /url/{primary_id} (Expect 301/302)", r, expected_codes=(301, 302))

            r_bad = self.safe_request("get", f"{self.base_url}/url/bad@char!")
            self.print_result("GET malformed ID 'bad@char!' (Expect 400/404)", r_bad, expected_codes=(400, 404))

            time.sleep(self.args.delay)
            self.log_step("PATCH Verification Logic")

            self.print_result("PATCH verify with wrong key (Expect 401)", self.safe_request("patch", f"{self.base_url}/verify/{primary_id}", headers={"Authorization": "Bearer WRONG_KEY"}), expected_codes=(401,))

            time.sleep(self.args.delay)
            self.print_result("First Verification (Expect 200)", self.safe_request("patch", f"{self.base_url}/verify/{primary_id}", headers=self.headers), expected_codes=(200,))

            time.sleep(self.args.delay)
            self.print_result("PATCH non-existent ID (Expect 400/404)", self.safe_request("patch", f"{self.base_url}/verify/no-id", headers=self.headers), expected_codes=(400, 404))

            time.sleep(self.args.delay)
            self.print_result("Second Verification (Already verified)", self.safe_request("patch", f"{self.base_url}/verify/{primary_id}", headers=self.headers), expected_codes=(200,))

            time.sleep(self.args.delay)

            r_after = self.safe_request("get", f"{self.base_url}/url/{primary_id}", allow_redirects=False)
            self.print_result(f"GET /url/{primary_id} after verification (Expect 301)", r_after, expected_codes=(301,))

    def test_pagination_and_limits(self):
        r_limit = self.safe_request("get", f"{self.base_url}/urls?count=999", headers=self.headers)
        self.print_result("GET /urls?count=999 (Abusive limit - Expect 400)", r_limit, expected_codes=(400,))

        time.sleep(self.args.delay)
        r_zero = self.safe_request("get", f"{self.base_url}/urls?count=0", headers=self.headers)
        self.print_result("GET /urls?count=0 (Expect 400)", r_zero, expected_codes=(400,))

        time.sleep(self.args.delay)
        r_negative = self.safe_request("get", f"{self.base_url}/urls?count=-1", headers=self.headers)
        self.print_result("GET /urls?count=-1 (Expect 400)", r_negative, expected_codes=(400,))

        time.sleep(self.args.delay)
        r_nan = self.safe_request("get", f"{self.base_url}/urls?count=abc", headers=self.headers)
        self.print_result("GET /urls?count=abc (Expect 400)", r_nan, expected_codes=(400,))

        time.sleep(self.args.delay)
        r = self.safe_request("get", f"{self.base_url}/urls?count=1", headers=self.headers)
        if self.print_result("GET /urls?count=1", r):
            try:
                data = r.json()
                if data.get("has_more") and data.get("next_cursor"):
                    cursor = data["next_cursor"]
                    time.sleep(self.args.delay)
                    self.print_result("GET /urls with cursor", self.safe_request("get", f"{self.base_url}/urls?count=1&cursor={cursor}", headers=self.headers))
            except Exception:
                print("    Could not parse /urls response JSON.")

        time.sleep(self.args.delay)
        invalid_cursor = "nonexistent123"
        r_invalid = self.safe_request("get", f"{self.base_url}/urls?count=1&cursor={invalid_cursor}", headers=self.headers)
        self.print_result("GET /urls with invalid cursor (Expect 400)", r_invalid, expected_codes=(400,))

    def test_delete_endpoints(self):
        if not self.created_ids:
            return

        unique_ids = list(dict.fromkeys(self.created_ids))
        cid0 = unique_ids[0]
        
        self.print_result(f"DELETE /delete/{cid0} with wrong key (Expect 401)", self.safe_request("delete", f"{self.base_url}/delete/{cid0}", headers={"Authorization": "Bearer WRONG_KEY"}), expected_codes=(401,))

        for cid in unique_ids:
            time.sleep(self.args.delay)
            self.print_result(f"DELETE /delete/{cid}", self.safe_request("delete", f"{self.base_url}/delete/{cid}", headers=self.headers), expected_codes=(200,))

        time.sleep(self.args.delay)
        self.print_result(f"DELETE already deleted {cid0} (Expect 404)", self.safe_request("delete", f"{self.base_url}/delete/{cid0}", headers=self.headers), expected_codes=(400, 404))

        time.sleep(self.args.delay)
        self.print_result("DELETE non-existent (Expect 400/404)", self.safe_request("delete", f"{self.base_url}/delete/no-id", headers=self.headers), expected_codes=(400, 404))

    def test_sync_counter(self):
        self.log_step("Sync DB Counter (Maintenance)")

        r_wrong = self.safe_request("patch", f"{self.base_url}/sync-counter", headers=self.bad_headers)
        self.print_result("PATCH /sync-counter with wrong key (Expect 401)", r_wrong, expected_codes=(401,))

        time.sleep(self.args.delay)

        r_sync = self.safe_request("patch", f"{self.base_url}/sync-counter", headers=self.headers)
        
        if self.print_result("PATCH /sync-counter final execution (Expect 200)", r_sync, expected_codes=(200,)):
            try:
                data = r_sync.json()
                new_count = data.get("new_count")
                self.log_success(f"Counter synchronized. DB real count: {new_count}")
            except Exception:
                self.log_info("Sync success but could not parse response body.")

    def test_invalid_endpoint(self):
        self.print_result("GET /random (Expect 404)", self.safe_request("get", f"{self.base_url}/not-here", headers=self.headers), expected_codes=(404,))

        time.sleep(self.args.delay)
        self.print_result("GET /url/short (Expect 400)", self.safe_request("get", f"{self.base_url}/url/short", headers=self.headers), expected_codes=(400,))

    def execute_all(self):
        self.log_info(f"Starting Robust CI Suite against {self.base_url}")

        self.run_test("Security & Base", self.test_security_and_base)
        self.run_test("GET /favicon.ico", self.test_favicon)
        self.run_test("Rate Limiting", self.test_rate_limiting)
        self.run_test("POST Validation (Body & Length)", self.test_post_validation)
        self.run_test("POST Exotic URLs", self.test_exotic_urls)
        self.run_test("Idempotency Check", self.test_idempotency)
        self.run_test("POST Valid URL Creation", self.test_creation_and_verification)
        self.run_test("GET /urls Pagination & Limits", self.test_pagination_and_limits)
        self.run_test("DELETE Endpoints", self.test_delete_endpoints)
        self.run_test("Sync DB Counter", self.test_sync_counter)
        self.run_test("Invalid Endpoint", self.test_invalid_endpoint)

        if self.tests_passed:
            print(f"\n[RESULT] SUCCESS: Full suite passed at {time.strftime('%H:%M:%S')}")
            sys.exit(0)
        else:
            print(f"\n[RESULT] FAILURE: Some tests failed. Check logs above.")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description="Full API CI Suite - Robust Version")
    parser.add_argument("--link", required=True, help="Long URL to use for tests")
    parser.add_argument("--remote", required=True, help="Remote worker URL")
    parser.add_argument("--delay", type=int, default=1, help="Delay between calls")
    parser.add_argument("--max-url-length", type=int, default=2000, help="Max URL length to test against")
    parser.add_argument("--timeout", type=int, default=10, help="Request timeout in seconds")
    args = parser.parse_args()

    admin_key = os.getenv("ADMIN_KEY")
    if not admin_key:
        print("[FAIL] ADMIN_KEY environment variable is missing.")
        sys.exit(1)

    suite = APITestSuite(args, admin_key)
    suite.execute_all()

if __name__ == "__main__":
    main()