<div align="center">

# 🔗 NSH — Serverless URL Shortener

**A lightweight serverless URL shortener API, backed by [Firebase Realtime Database](https://firebase.google.com/products/realtime-database).**

Built on [Cloudflare Workers](https://workers.cloudflare.com/) and developed with [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Nde-Code/NSH)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

This project is intended for **personal use and small-scale deployments**, and runs with minimal resource usage.

## 📑 Table of contents

- [🚀 Key features](#-key-features)
- [🌐 API access](#-api-access)
- [📚 Available endpoints](#-available-endpoints)
    - [1. `/post-url` — Create short URL](#1-post-post-url---create-short-url)
    - [2. `/url/:code` — Redirect to original URL](#2-get-urlcode---redirect-to-original-url)
    - [3. `/urls` — List all URLs](#3-get-urls---list-all-urls)
    - [4. `/verify/:code` — Verify URL](#4-patch-verifycode---verify-url)
    - [5. `/delete/:code` — Delete URL](#5-delete-deletecode---delete-url)
    - [6. `/sync-counter` — Resynchronize counter](#6-patch-sync-counter---resynchronize-counter)
    - [7. `/health` — Service health check](#7-get-health---service-health-check)
- [🔐 Authentication](#-authentication)
- [🖥️ Developer documentation](#️-developer-documentation)
- [⚖️ License](#️-license)
- [🎯 Author](#-author)

---

## 🚀 Key features

- **Rate limiting** — daily request quotas and burst traffic protection (anti-spam).
- **No duplicates** — prevents storing identical URLs, saving database space.
- **No sign-up** — no account creation, credit card, or personal data required.
- **Privacy-conscious** — built with privacy in mind, with GDPR principles considered where relevant.
- **Highly configurable** — customize behavior to your needs.
- **Firebase backend** — stores URL mappings in Firebase Realtime Database.
- **Minimal REST API** — fast, efficient, and lightweight.
- **Serverless** — runs on the Cloudflare Workers free plan with strict resource limits.

## 🌐 API access

| Endpoint                                                               | Rate limit                        | Maintainer                        |
| ---------------------------------------------------------------------- | --------------------------------- | --------------------------------- |
| [https://nsh.nde-code.workers.dev/](https://nsh.nde-code.workers.dev/) | 1 req/IP/sec, 10 new links/IP/day | [Me](https://nde-code.github.io/) |

CORS is enabled only for the URL-posting endpoint, for clear security reasons.

> 📡 Check the [status page](https://nde-status.instatus.com/) if you experience latency or other issues while using the public online instance.

**Notes:**

- Feel free to use the public instance, but be aware of the limits.
- Keep an eye on the repository to catch any changes to these limits.
- The Firebase RTDB database is located in Belgium on the public instance, so users from distant countries may experience some latency.
- [Smart Placement](https://developers.cloudflare.com/workers/configuration/placement/#enable-smart-placement-1) routing is enabled for a better experience.
- The rate-limiting system temporarily processes IP addresses, which are pseudonymized using a hash combined with a secret salt before being used for rate limiting. For burst protection, the hashed value is temporarily stored in [Cloudflare Workers Cache](https://developers.cloudflare.com/workers/runtime-apis/cache/), while daily limits use [Cloudflare Workers KV](https://developers.cloudflare.com/kv/). The hashed value is retained only for the time required to enforce these limits and is automatically removed afterward.

## 📚 Available endpoints

> ℹ️ In this section, `https://your-worker.org.workers.dev/` is used in the cURL command examples. If you've deployed your own instance of the project, replace it with your instance's domain. Otherwise, use the free public instance at `https://nsh.nde-code.workers.dev/`, as explained above.

### 1. **[POST]** `/post-url` - Create short URL

Create a short URL from a long URL. Saves to database and applies rate limiting.

**Request body:**

| Field      | Type   | Description                                           |
| ---------- | ------ | ----------------------------------------------------- |
| `long_url` | string | **Required.** Original URL to shorten (must be valid) |

> **Note:** request fails if JSON contains unexpected fields or URL exceeds max length.

**Response codes:**

| Code  | Description                                                        |
| ----- | ------------------------------------------------------------------ |
| `201` | URL successfully shortened and saved                               |
| `200` | URL already shortened previously (returns existing short link)     |
| `400` | Invalid body, missing `long_url`, unexpected field, or invalid URL |
| `409` | Hash collision (different URL, same hash)                          |
| `429` | Rate limit exceeded (time-based or daily write limit)              |
| `500` | Server error (config, environment, or generation failure)          |
| `503` | KV quota exceeded or database read failure                         |
| `507` | Firebase entry limit reached                                       |

**Example request:**

```bash
curl -X POST "https://your-worker.org.workers.dev/post-url" \
     -H "Content-Type: application/json" \
     -d '{"long_url": "https://nde-code.github.io/"}'
```

**Example response:**

```json
{
    "success": "https://your-worker.org.workers.dev/url/11i7yev0000000"
}
```

---

### 2. **[GET]** `/url/:code` - Redirect to original URL

Redirect to the original long URL using the short code.

**Path parameters:**

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `code`    | string | **Required.** Unique short ID |

**Response codes:**

| Code  | Description                                   |
| ----- | --------------------------------------------- |
| `301` | Permanent redirect (verified link)            |
| `302` | Temporary redirect (unverified link)          |
| `400` | No valid ID in path                           |
| `404` | Link not found in database                    |
| `500` | Server error                                  |
| `503` | Request timeout or storage connection failure |

**Example request:**

```bash
curl -i "https://your-worker.org.workers.dev/url/11i7yev0000000"
```

---

### 3. **[GET]** `/urls` - List all URLs

Retrieve a paginated list of shortened links.

> 🔒 **Security:** requires a valid admin key (see [authentication](#-authentication)).

**Query parameters:**

| Parameter | Type   | Description                                                          |
| --------- | ------ | -------------------------------------------------------------------- |
| `count`   | number | Number of links to retrieve (default: config value, max: restricted) |
| `cursor`  | string | Last item key from previous page (use `next_cursor` from response)   |

**Response codes:**

| Code  | Description                           |
| ----- | ------------------------------------- |
| `200` | Successfully returned URLs            |
| `400` | Invalid `count` or `cursor` parameter |
| `401` | Invalid or missing API key            |
| `429` | Rate limit exceeded                   |
| `500` | Server error                          |
| `503` | Database retrieval failure            |

**Example request:**

```bash
curl "https://your-worker.org.workers.dev/urls?count=2" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

**Example response:**

```json
{
    "urls": {
        "11i7yev0000000": {
            "long_url": "https://nde-code.github.io/",
            "post_date": "2024-05-12T10:00:00.000Z",
            "is_verified": true
        },
        "vgsyqs00000000": {
            "long_url": "https://www.google.com/",
            "post_date": "2024-05-12T11:30:00.000Z",
            "is_verified": false
        }
    },
    "next_cursor": "vgsyqs00000000",
    "has_more": true
}
```

---

### 4. **[PATCH]** `/verify/:code` - Verify URL

Mark a shortened URL as verified.

> 🔒 **Security:** requires a valid admin key (see [authentication](#-authentication)).

**Path parameters:**

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `code`    | string | **Required.** Unique short ID |

**Response codes:**

| Code  | Description                                      |
| ----- | ------------------------------------------------ |
| `200` | Link verified successfully (or already verified) |
| `400` | No valid ID in path                              |
| `401` | Invalid or missing admin key                     |
| `404` | Link not found                                   |
| `429` | Rate limit exceeded                              |
| `500` | Server error                                     |
| `503` | Database update failure                          |

**Example request:**

```bash
curl -X PATCH "https://your-worker.org.workers.dev/verify/11i7yev0000000" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

---

### 5. **[DELETE]** `/delete/:code` - Delete URL

Remove a shortened URL and decrement the counter.

> 🔒 **Security:** requires a valid admin key (see [authentication](#-authentication)).

**Path parameters:**

| Parameter | Type   | Description                   |
| --------- | ------ | ----------------------------- |
| `code`    | string | **Required.** Unique short ID |

**Response codes:**

| Code  | Description                  |
| ----- | ---------------------------- |
| `200` | Link deleted successfully    |
| `400` | No valid ID in path          |
| `401` | Invalid or missing admin key |
| `404` | Link not found               |
| `429` | Rate limit exceeded          |
| `500` | Server error                 |
| `503` | Database deletion failure    |

**Example request:**

```bash
curl -X DELETE "https://your-worker.org.workers.dev/delete/11i7yev0000000" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

---

### 6. **[PATCH]** `/sync-counter` - Resynchronize counter

Recalculate and sync the metadata counter to match the actual URLs in Firebase. Useful for fixing race conditions or desynchronization.

> 🔒 **Security:** requires a valid admin or monitoring key (see [authentication](#-authentication)).

> **Note:** the admin key can be used to manually resynchronize the counter when needed. The monitoring key is also accepted, allowing the endpoint to be called automatically by external monitoring tools (as with `/health`) or scheduled services.

**Response codes:**

| Code  | Description                                       |
| ----- | ------------------------------------------------- |
| `200` | Counter resynced successfully (returns new count) |
| `401` | Invalid or missing admin key                      |
| `429` | Rate limit exceeded                               |
| `500` | Server error                                      |
| `503` | Database communication failure                    |

**Example request:**

```bash
curl -X PATCH "https://your-worker.org.workers.dev/sync-counter" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

**Example response:**

```json
{
    "success": "Counter synchronized successfully.",
    "new_count": 42
}
```

---

### 7. **[GET]** `/health` - Service health check

Check service health: configuration, database connectivity, counter integrity, capacity, and KV storage.

> 🔒 **Security:** requires a valid monitoring key (see [authentication](#-authentication)).

**Response codes:**

| Code  | Description                                                |
| ----- | ---------------------------------------------------------- |
| `200` | All systems operational                                    |
| `206` | Degraded but operational (one or more non-critical issues) |
| `503` | Service unavailable (critical failure)                     |

**Example request:**

```bash
curl -X GET "https://your-worker.org.workers.dev/health" \
     -H "x-api-key: YOUR_MONITORING_KEY"
```

**Example response (healthy):**

```json
{
    "status": "healthy",
    "timestamp": "2026-04-26T20:17:27.121Z",
    "checks": {
        "config_valid": true,
        "firebase_reachable": true,
        "counter_accessible": true,
        "kv_store_available": true
    },
    "message": "All systems operational."
}
```

## 🔐 Authentication

Protected endpoints require either header format:

- `Authorization: Bearer <MONITORING_or_ADMIN_KEY>`
- `x-api-key: <MONITORING_or_ADMIN_KEY>`

> ⛔ **Note:** trying to access the administration endpoints on the public instance is **completely forbidden**.

## 🖥️ Developer documentation

For setup, configuration, and deployment using the Wrangler CLI, see the **[developer guide](docs/documentation.md)**.

## ⚖️ License

This project is licensed under the **[Apache License v2.0](LICENSE)**.

## 🎯 Author

Created and maintained by **[Nde-Code](https://nde-code.github.io/)**.

> Don't hesitate to open an issue or a pull request if you have any questions or would like to contribute.
