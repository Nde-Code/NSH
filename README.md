# 🔗 URL Shortener API with Firebase RTDB:

A simple and lightweight URL shortener API built with [Wrangler](https://developers.cloudflare.com/workers/wrangler/) and [Firebase Realtime Database](https://firebase.google.com/products/realtime-database).

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Nde-Code/nsh&branch=cf-workers)

## 📦 Features:

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

| Public endpoint | Rate limit | Admin endpoints + limits | Privacy policy |
|-----------------|------------|----------------------------|----------------|
| https://nsh.nde-code.workers.dev/ | 1 req/sec, 10 new links/day | `/urls`, `/delete/:code`, `/verify/:code` — 1 req/sec | https://github.com/Nde-Code/nsh/blob/cf-workers/privacy.md |

To use this **API endpoints** you can use:

- JavaScript: CORS is `enabled` and for all domains.

- cURL: [https://curl.se/](https://curl.se/)

- Postman *(Recommended)*: [https://www.postman.com/](https://www.postman.com/)

### Here’s a complete list of the available methods:
| Method | Endpoint           | Description                                                                 | Request Body                                 | Response                                                                                                                                       |
|--------|--------------------|-----------------------------------------------------------------------------|----------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| **POST**   | `/post-url`        | Create a short URL from a long one.                                         | `{ "long_url": "https://example.com" }`      | `200 OK`: `{ "<localized_success>": "https://.../:code" }`  <br> `400 Bad Request`: Invalid body, missing `long_url`, unexpected field, or invalid URL format <br> `429 Too Many Requests`: Rate limit exceeded <br> `507 Insufficient Storage`: Database limit reached |
| **GET**    | `/urls`            | Retrieve the full list of stored links. <br> **API/ADMIN key required**                               | *None*                                       | `200 OK`: `{ [code]: { long_url: string, post_date: string, is_verified: boolean } }` if link(s) or <br> `no URL(s)` otherwise <br> `401 Unauthorized`: Invalid API key  <br> `429 Too Many Requests`: Rate limit exceeded                                     |
| **GET**    | `/url/:code`       | Redirect to the original long URL associated with the short code.           | *None*                                       | `301 Moved Permanently` (if `is_verified = false`) <br> `302 Found` (otherwise) <br> `404 Not Found`: Invalid or unknown code                  |
| **PATCH**    | `/verify/:code`    | Mark the URL as verified (`is_verified = true`). <br> **API/ADMIN key required** | *None*                                       | `200 OK`: Verified successfully / Already verified <br> `404 Not Found` <br> `401 Unauthorized`: Invalid API key <br> `429 Too Many Requests`: Rate limit exceeded                              |
| **DELETE**    | `/delete/:code`    | Delete a shortened URL from the database. <br> **API/ADMIN key required**     | *None*                                       | `200 OK`: Link deleted <br> `404 Not Found` <br> `401 Unauthorized`: Invalid API key <br> `429 Too Many Requests`: Rate limit exceeded                                                          |

### Authentication

To access protected endpoints, you must include an API or ADMIN key in **the request headers** using one of the following:

- `Authorization: Bearer <API_or_ADMIN_KEY>`

- `x-api-key: <API_or_ADMIN_KEY>`

## 🚀 Getting Started:

### For those who want to create their own instance using Deno.

> ### For those looking for the Wrangler (Cloudflare Workers) version, check out: [https://github.com/Nde-Code/nsh/tree/cf-workers](https://github.com/Nde-Code/nsh/tree/cf-workers)

### 1. Install deno, clone the project and go in the folder:

First of all, you need to have [Deno](https://deno.com/) installed on your system.

> Take a look at this page: [https://docs.deno.com/runtime/getting_started/installation/](https://docs.deno.com/runtime/getting_started/installation/)

> I use VSCode as the code editor for this project, and the configuration is provided in [`.vscode/settings.json`](.vscode/settings.json). Make sure you have the Deno extension installed as well.

Once that's done, clone this repository and go into the folder using:

```bash
git clone https://github.com/Nde-Code/nsh.git
cd nsh
```

### 2. Edit the `config.ts` file:

Open the file `config.ts` and normally you should see in:

```ts
export const config: Config = {

  FIREBASE_URL: Deno.env.get("FIREBASE_HOST_LINK") ?? "",

  FIREBASE_HIDDEN_PATH: Deno.env.get("FIREBASE_HIDDEN_PATH") ?? "",

  HASH_KEY: Deno.env.get("HASH_KEY") ?? "",

  ADMIN_KEY: Deno.env.get("ADMIN_KEY") ?? "",

  LANG_CODE: 'en',
    
  RATE_LIMIT_INTERVAL_S: 1, // min: 1

  MAX_DAILY_WRITES: 20, // min: 1

  IPS_PURGE_TIME_DAYS: 1, // min: 1

  FIREBASE_TIMEOUT_MS: 6000, // min: 1000

  FIREBASE_ENTRIES_LIMIT: 1000, // min: 50

  SHORT_URL_ID_LENGTH: 14, // min: 10

  MAX_URL_LENGTH: 2000 // min: 100

};
```

- **FIREBASE_URL**, **FIREBASE_HIDDEN_PATH**, **HASH_KEY**, **ADMIN_KEY**: These are values read from the `.env` file, so please **do not modify them**.

- **LANG_CODE**: Supported language translations are available for responses. Currently, the following languages are supported:

  - `fr` = `Français` 

  - `en` = `English` (Currently)

- **RATE_LIMIT_INTERVAL_S** in [second]: This is the rate limit based on requests. Currently: one request per second.

- **MAX_DAILY_WRITES** in [day]: Daily writing rate limit (only applies if the link is not already in the database). Currently: 20 writes per day.

- **IPS_PURGE_TIME_DAYS** in [day]: The number of days before purging the `Deno.kv` store that contains hashed IPs used for rate limiting. Currently: 1 day.

- **FIREBASE_TIMEOUT_MS** in [millisecond]: The timeout limit for HTTP requests to the Firebase Realtime Database. Currently: 6 seconds.

- **FIREBASE_ENTRIES_LIMIT**: The maximum number of entries allowed in your Firebase Realtime Database. Currently: 1000 entries.

- **SHORT_URL_ID_LENGTH**: The length of the shortcode used for shortened URLs. You should probably not change this value to ensure no collisions occur with `sha256`. Currently: 14 characters.

- **MAX_URL_LENGTH**: The maximum allowed URL length in the Firebase Realtime Database. Currently: 2000 characters.

### Ensure that you respect the `min` value specified in the comment; otherwise, you will get an error message with your configuration.

### 3. Create a Firebase Realtime Database to store the links:

1. Go to [firebase.google.com](https://firebase.google.com/) and create an account.  
   > _(If you already have a Google account, you're good to go.)_

2. Create a **project** and set up a `Realtime Database`.

   > 🔍 If you get stuck, feel free to check out the official [Firebase documentation](https://firebase.google.com/docs/build?hl=en), or search on Google, YouTube, etc.

3. Once your database is ready, go to the **`Rules`** tab and paste the following code in the editor:
```JSON
{
  
  "rules": {

    "YOUR_SECRET_PATH": {
        
      ".read": true,
          
      "$shortcode": {
          
        ".write": "(!data.exists() && newData.exists()) || (data.exists() && !newData.exists()) || (data.exists() && newData.exists() && data.child('long_url').val() === newData.child('long_url').val() && data.child('post_date').val() === newData.child('post_date').val() && newData.child('is_verified').isBoolean() && newData.hasChild('post_date') && newData.child('long_url').isString() && newData.child('post_date').isString())",
          
        ".validate": "(!newData.exists()) || (newData.child('is_verified').isBoolean() && newData.child('long_url').isString() && newData.child('long_url').val().length <= 2000 && newData.child('long_url').val().matches(/^(ht|f)tp(s?):\\/\\/[0-9a-zA-Z]([\\-\\.\\w]*[0-9a-zA-Z])*(?::[0-9]+)?(\\/.*)?$/) && newData.child('post_date').isString() && newData.child('post_date').val().matches(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$/))",
          
        "long_url": {
              
          ".validate": "newData.isString() && newData.val().length <= 2000 && newData.val().matches(/^(ht|f)tp(s?):\\/\\/[0-9a-zA-Z]([\\-\\.\\w]*[0-9a-zA-Z])*(?::[0-9]+)?(\\/.*)?$/)"
            
        },

        "post_date": {
              
          ".validate": "newData.isString() && newData.val().matches(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$/)"
            
        },

        "is_verified": {
              
          ".validate": "newData.isBoolean()"
              
        },

        "$other": {
              
          ".validate": false
              
        }
        
      }
        
    }
      
  }
  
}
```

Here is a brief summary of these rules:

| Action        | Allowed if...                                                                         |
|---------------|----------------------------------------------------------------------------------------|
| **Read**      | Always allowed                                                                         |
| **Write**    | Valid `long_url`, `post_date`, and `is_verified` *(required)* fields                                |
| **Delete**    | Always allowed                                                                         |
| **Update**    | Only `is_verified` can change; `long_url` and `post_date` must stay the same           |
| **Extra fields** | Not allowed                                                                         |

### 4. Create and edit the `.env` file:

```env
FIREBASE_HOST_LINK="YOUR_FIREBASE_URL"
FIREBASE_HIDDEN_PATH="YOUR_SECRET_PATH"
HASH_KEY="THE_KEY_USED_TO_HASH_IPS"
ADMIN_KEY="THE_ADMIN_KEY_TO_DELETE_AND_VERIFY"
```

With:

- **FIREBASE_HOST_LINK**: The URL of your Firebase Realtime Database.

- **FIREBASE_HIDDEN_PATH**: A secret directory where data is stored. This approach follows the principle of `security through obscurity`. **The value must match exactly in the Firebase Realtime Database security `Rules`.**

- **HASH_KEY**: The `SALT` value used to hash IP addresses. Ensure this value is both secure and robust.

- **ADMIN_KEY**: An administrative key that grants the owner permission to `delete`, `list` and `verify` links.

### 5. Run the project:

When setup is complete, start the project with:

```bash
deno task dev
```

## ⚖️ License:

This project is licensed under the [Apache License v2.0](LICENSE).

## 📞 Contact:

Created and maintained by [Nde-Code](https://nde-code.github.io/).

> Feel free to reach out for questions or collaboration, or open an issue or pull request and I'll be happy to help.
 