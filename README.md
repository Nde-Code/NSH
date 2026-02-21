# URL Shortener API with Firebase RTDB:

A simple, lightweight URL shortener API built with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) and [Firebase Realtime Database](https://firebase.google.com/products/realtime-database).

It operates at the edge across 300+ cities to ensure the lowest possible latency. If you need more resources for your instance, you can self-host the project on your own [Cloudflare Workers](https://workers.cloudflare.com/) account by clicking the deploy button below.

At the beginning, I just needed a small piece of software to store links, so I designed this project to be suitable for personal use or small public instances. You can use it for any purpose, but some systems are intentionally designed to be lightweight, such as the URL hashing mechanism, which uses DJB2, and the protection against timing attacks on the admin key (to ensure both security and performance).

Please keep this in mind and use it with caution if you plan to deploy it at scale.

If you only need the project for occasional work, feel free to use my public online instance; however, please keep my usage limits in mind in this case.

> I host the project on the free plan. Usually, there are no resource issues because the software consumes very little in its steady state. However, the first request may consume more resources (e.g., CPU time) due to a [cold start](https://blog.cloudflare.com/eliminating-cold-starts-2-shard-and-conquer/), but it stays within the limits of the free plan.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Nde-Code/NSH)

## 🚀 Features:

- Provides protection by limiting the daily request quota and preventing burst traffic, such as spam or rapid-fire requests.

- No duplicate URLs (saves space in your database).

- No sign-up, no credit card, or other personal information required.

- No logs are maintained to track user activity.

- Highly configurable.

- Store mappings in Firebase Realtime Database.

- Minimal and fast REST API.

- Serverless because it runs on a Cloudflare Worker with strict resource limits (Free plan).

## 🛡 GDPR Compliance:

This project is designed with **GDPR compliance** in mind:

- No direct IP addresses or personal data are stored.

- No user privacy information is logged.

- Basic rate limiting is implemented by hashing **IP addresses**:

  - Hashing is done using `SHA-256`, combined with a **strong, secret salt**.

  - Hashes are stored only in an NoSQL database called [KV](https://developers.cloudflare.com/kv/).

  - IP hashes are automatically deleted after a configurable retention period.

- No tracking, cookies, or analytics.

This ensures that no identifiable user data is collected, stored, or shared in any form.

## 🌐 API Endpoints:

The API is available here:

| Public endpoint: | Rate limit: | Owner: | Privacy policy: |
|-----------------|------------|----------------|----------------|
| [https://nsh.nde-code.workers.dev/](https://nsh.nde-code.workers.dev/) | 1 req/sec, 10 new links/day | [Nde-Code](https://nde-code.github.io/) | [privacy.md](docs/privacy.md) |

To use this API you can use:

- **JavaScript** in the browser: CORS is enabled for all domains (but only for the posting URL, of course).

- **cURL** from a terminal, for all endpoints: [https://curl.se/](https://curl.se/)

- **Postman** *(Recommended)*, for all endpoints: [https://www.postman.com/](https://www.postman.com/)

### 1. **[POST]** `/post-url`

Create a short URL from a provided long URL. Saves the link to the database and applies rate limiting constraints.

#### **Request Body:**

| Field       | Type   | Description                                                                 |
| ----------- | ------ | --------------------------------------------------------------------------- |
| `long_url`  | string | **Required.** The original long URL you want to shorten. Must be valid. |

> **Note:** The request will fail if the JSON body contains any unexpected fields other than `long_url`, or if the URL exceeds the maximum configured length.

#### **Response:**

* `201 Created`: URL successfully shortened and saved.

* `200 OK`: The URL was already shortened previously (returns existing short link).

* `400 Bad Request`: Invalid body, missing `long_url`, unexpected field, or invalid URL format.

* `409 Conflict`: Hash Collision (different URL, same hash). 

* `429 Too Many Requests`: Rate limit exceeded (either time-based or daily write limit).

* `500 Internal Server Error`: Generation failure.

* `503 Service Unavailable`: KV Database quota exceeded (process rate limits), unable to read `_url_counter` or verify link existence.

* `507 Insufficient Storage`: Firebase database entry limit reached.

#### **Example request:**

```bash
curl -X POST "https://your-worker.org.workers.dev/post-url" \
     -H "Content-Type: application/json" \
     -d '{"long_url": "https://nde-code.github.io/"}'
```

#### **Example response:**

```json
{
  "success": "https://your-worker.org.workers.dev/url/11i7yev0000000"
}
```

### 2. **[GET]** `/url/:code`

Redirects the user to the original long URL associated with the provided short code.

#### **Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | string | **Required.** The unique short ID of the URL. |

#### **Response:**

* `301 Moved Permanently`: Successful redirection (if the link `is_verified` is true).

* `302 Found`: Successful redirection (if the link `is_verified` is false).

* `400 Bad Request`: No valid ID provided in the path.

* `404 Not Found`: No link found with this ID in the database.

* `503 Service Unavailable`: The request timed out or the connection to the storage provider failed.

#### **Example Request:**

```bash
curl -i "https://your-worker.org.workers.dev/url/11i7yev0000000"
```

### 3. **[GET]** `/urls`

Retrieve a paginated list of shortened links currently stored in the database.

> **Security:** Requires a valid Admin/API key.

#### **Query Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `count` | number | Number of links to retrieve (defaults to configured value, max is restricted). |
| `cursor` | string | The key/ID to start fetching from for pagination. |

#### **Response:**

* `200 OK`: Successful query returning the URLs.

* `400 Bad Request`: The `count` or `cursor` parameter is invalid.

* `401 Unauthorized`: Invalid or missing API/Admin key.

* `429 Too Many Requests`: Rate limit exceeded.

* `503 Service Unavailable`: Unable to retrieve links from the database.

#### **Example request:**

```bash
curl "https://your-worker.org.workers.dev/urls?count=2" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

#### **Example response:**

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

### 4. **[PATCH]** `/verify/:code`

Mark a specific shortened URL as verified in the database.

> **Security:** Requires a valid Admin/API key.

#### **Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | string | **Required.** The unique short ID of the URL. |

#### **Response:**

* `200 OK`: Link verified successfully, or link was already verified.

* `400 Bad Request`: No valid ID provided in the path.

* `401 Unauthorized`: Invalid or missing API/Admin key.

* `404 Not Found`: No link found with this ID in the database.

* `429 Too Many Requests`: Rate limit exceeded.

* `503 Service Unavailable`: Temporary issue updating the database.

#### **Example Request:**

```bash
curl -X PATCH "https://your-worker.org.workers.dev/verify/11i7yev0000000" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

### 5. **[DELETE]** `/delete/:code`

Delete a shortened URL from the database and decrement the global metadata counter.

> **Security:** Requires a valid Admin/API key.

#### **Path Parameters:**

| Parameter | Type | Description |
| --- | --- | --- |
| `code` | string | **Required.** The unique short ID of the URL. |

#### **Response:**

* `200 OK`: Link successfully deleted.

* `400 Bad Request`: No valid ID provided in the path.

* `401 Unauthorized`: Invalid or missing API/Admin key.

* `404 Not Found`: No link found with this ID in the database.

* `429 Too Many Requests`: Rate limit exceeded.

* `503 Service Unavailable`: Temporary issue deleting the entry.

#### **Example request:**

```bash
curl -X DELETE "https://your-worker.org.workers.dev/delete/11i7yev0000000" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

### 6. **[PATCH]** `/sync-counter`

Recalculate and synchronize the metadata counter to reflect the actual number of URLs stored in the Firebase database. Useful for fixing race conditions or desyncs.

> **Security:** Requires a valid Admin/API key.

#### **Response:**

* `200 OK`: Counter successfully resynced (returns the new count).

* `401 Unauthorized`: Invalid or missing API/Admin key.

* `429 Too Many Requests`: Rate limit exceeded.

* `503 Service Unavailable`: Temporary issue communicating with the database.

#### **Example request:**

```bash
curl -X PATCH "https://your-worker.org.workers.dev/sync-counter" \
     -H "x-api-key: YOUR_ADMIN_KEY"
```

#### **Example response:**

```json
{
  "success": "Counter synchronized successfully.",
  "new_count": 42
}
```

### Authentication:

To access protected endpoints, you must include an API or ADMIN key in **the request headers** using one of the following:

- `Authorization: Bearer <API_or_ADMIN_KEY>`

- `x-api-key: <API_or_ADMIN_KEY>`

> Of course, on my personal instance, trying to access these admin endpoints is forbidden.

## 🖥️ Documentation for developers:

Those interested in working on or launching this project from source using the Wrangler CLI can refer to the developer documentation by clicking [here](docs/docs.md).

## ⚖️ License:

This project is licensed under the [Apache License v2.0](LICENSE).

## 🎯 Reach me:

Created and maintained by [Nde-Code](https://nde-code.github.io/).

> Feel free to reach out for questions or collaboration, or open an issue or pull request and I'll be happy to help.
 
