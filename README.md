# URL Shortener API with Firebase RTDB:

A simple and lightweight URL shortener API built with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) and [Firebase Realtime Database](https://firebase.google.com/products/realtime-database).

> I host the project on the free Workers plan. Normally, there are no issues with resources because the software consumes very few resources. It's very lightweight; both memory and CPU consumption are minimal. Usually, the only thing you need to take into consideration is the number of requests you might need, depending on your use case. 

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Nde-Code/NSH)

## 🚀 Features:

- Provides protection by limiting the daily request quota and preventing burst traffic, such as spam or rapid-fire requests.

- No duplicate URLs (saves space in your database).

- No sign-up, no credit card, or other personal information required.

- No logs are maintained to track user activity.

- Highly configurable.

- Store mappings in Firebase Realtime Database.

- Minimal and fast REST API.

- Multi-language support for response messages.

## 🛡 GDPR Compliance:

This project is designed with **GDPR compliance** in mind:

- ❌ No direct IP addresses or personal data are stored.

- ❌ No user privacy information is logged.

- ⚠️ **Basic rate limiting** is implemented by hashing **IP addresses**:

  - Hashing is done using `SHA-256`, combined with a **strong, secret salt**.

  - Hashes are stored only in an NoSQL database called [KV](https://developers.cloudflare.com/kv/).

  - IP hashes are automatically deleted after a configurable retention period.

- ✅ No tracking, cookies, or analytics.

This ensures that no identifiable user data is collected, stored, or shared in any form.

## 🌐 API Endpoints:

The API is available in two versions, each with its own usage details:

| Public endpoint: | Rate limit: | Owner: | Privacy policy: |
|-----------------|------------|----------------|----------------|
| [https://nsh.nde-code.workers.dev/](https://nsh.nde-code.workers.dev/) | 1 req/sec, 10 new links/day | [Nde-Code](https://nde-code.github.io/) | [privacy.md](docs/privacy.md) |

To use this API you can use:

- **JavaScript** in the browser: CORS is enabled for all domains (but only for the posting URL, of course).

- **cURL** from a terminal: [https://curl.se/](https://curl.se/)

- **Postman** *(Recommended)*: [https://www.postman.com/](https://www.postman.com/)

### Here’s a complete list of the available methods:
| Method | Endpoint           | Description                                                                 | Request Body                                 | Response                                                                                                                                       |
|--------|--------------------|-----------------------------------------------------------------------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| **POST**   | `/post-url`        | Create a short URL from a long one.                                         | `{ "long_url": "https://example.com" }`      | `200 OK`: `{ "<localized_success>": "https://.../:code" }` <br> `503 Unavailable`: KV db unavailable <br> `400 Bad Request`: Invalid body, missing `long_url`, unexpected field, or invalid URL format <br> `429 Too Many Requests`: Rate limit exceeded <br> `507 Insufficient Storage`: Database limit reached |
| **GET**    | `/urls`            | Retrieve links from the database (optionally using the `count` parameter to limit the number of links returned; defaults to the configured number if not provided) <br> **API/ADMIN key required**                               | *None*                                       | `200 OK`: `{ [code]: { long_url: string, post_date: string, is_verified: boolean } }` if link(s) or <br> `no URL(s)` otherwise <br> `401 Unauthorized`: Invalid API key  <br> `429 Too Many Requests`: Rate limit exceeded                                     |
| **GET**    | `/url/:code`       | Redirect to the original long URL associated with the short code.           | *None*                                       | `301 Moved Permanently` (if `is_verified = false`) <br> `302 Found` (otherwise) <br> `404 Not Found`: Invalid or unknown code                  |
| **PATCH**    | `/verify/:code`    | Mark the URL as verified (`is_verified = true`). <br> **API/ADMIN key required** | *None*                                       | `200 OK`: Verified successfully / Already verified <br> `404 Not Found` <br> `401 Unauthorized`: Invalid API key <br> `429 Too Many Requests`: Rate limit exceeded                              |
| **DELETE**    | `/delete/:code`    | Delete a shortened URL from the database. <br> **API/ADMIN key required**     | *None*                                       | `200 OK`: Link deleted <br> `404 Not Found` <br> `401 Unauthorized`: Invalid API key <br> `429 Too Many Requests`: Rate limit exceeded                                                          |

### Authentication

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
 