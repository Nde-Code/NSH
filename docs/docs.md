# Developer documentation:

Complete developer guide for contributing to this project or creating your own version to run on [Cloudflare Workers](https://workers.cloudflare.com/) using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## 🚀 Getting started:

### 1. Create or log-in to Cloudflare:

Visit [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) to create an account or log in.

### 2. Install Node.js and NPM:

Download from [https://nodejs.org/en/download](https://nodejs.org/en/download).

### 3. Install Wrangler CLI:

```bash
npm install -g wrangler
```

> If Wrangler is not installed globally, prefix commands with `npx` (e.g., `npx wrangler`).

### 4. Clone the repository:

```bash
git clone https://github.com/Nde-Code/NSH.git
```

### 5. Authenticate with Cloudflare:

```bash
wrangler login
```

## ⚙️ Configuration setup:

Review the [`wrangler.jsonc`](../wrangler.jsonc) file, which contains the complete project configuration:

```jsonc
{
	"name": "project_name",
	"main": "main.ts",
	"compatibility_date": "2026-03-08",
	"preview_urls": false,
	"observability": {
		"enabled": true,
		"head_sampling_rate": 1,
		"logs": {
			"invocation_logs": false
		},
		"traces": {
			"enabled": false
		}
	},
	"kv_namespaces": [
		{
			"binding": "YOUR_KV_NAME",
			"id": "YOUR_KV_ID"
		}
	]
}
```

### Core configuration fields:

#### `name`

Defines the **Worker project name**.
This determines your public URL (e.g., `https://project_name.username.workers.dev`).

#### `main`

Specifies the **entry point** of your Worker script.
This file exports your main fetch handler.

#### `compatibility_date`

Locks your Worker to a specific Cloudflare Workers runtime version.
Ensures compatibility even as Cloudflare updates the platform.

#### `preview_urls`

Enables preview URLs for testing. Learn more: [https://developers.cloudflare.com/workers/configuration/previews/](https://developers.cloudflare.com/workers/configuration/previews/)

### Observability configuration:

#### `observability.enabled`

When `true`, enables **automatic metrics and logs collection**.
Allows performance and error monitoring in the Cloudflare dashboard.

#### `observability.head_sampling_rate`

Defines the **percentage of requests sampled for tracing** (0 to 1):

* `1` = 100% sampling (useful for debugging)
* `0.1` = 10% sampling (better for production)

#### `observability.logs.invocation_logs`

Controls **automatic invocation log collection**:

* `true` = Logs request metadata, headers, and execution details
* `false` = Disables automatic logs, keeping only custom `console.log` entries

> Disabling invocation logs is **recommended for GDPR compliance** to prevent storage of sensitive request data.

#### `observability.traces.enabled`

Controls **distributed tracing**:

* `true` = Enables tracing spans and trace IDs
* `false` = Disables tracing entirely

> Leave disabled if not using OpenTelemetry or a tracing system.

### KV namespaces:

#### `kv_namespaces`

Binds your Worker to **Cloudflare KV (Key-Value)** namespace for rate limiting storage.

Create a Workers KV using:

```bash
wrangler kv namespace create YOUR_KV_NAME
```

> For more details: [https://developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/)

Complete `wrangler.jsonc` with:

* **`binding`** : Variable name used in your code (e.g., `YOUR_KV_NAME`)
* **`id`** : Unique namespace ID from your Cloudflare dashboard

### Environment variables:

Create a `.dev.vars` file for local development:

```env
FIREBASE_HOST_LINK="YOUR_FIREBASE_URL"
FIREBASE_HIDDEN_PATH="YOUR_SECRET_PATH"
HASH_KEY="THE_KEY_USED_TO_HASH_IPS"
ADMIN_KEY="THE_ADMIN_KEY_TO_VERIFY_LIST_AND_DELETE"
MONITORING_KEY="THE_KEY_USED_FOR_MONITORING"
```

#### Variables in this project:

| Variable | Description |
|----------|-------------|
| `FIREBASE_HOST_LINK` | Public or private Firebase endpoint for your Worker |
| `FIREBASE_HIDDEN_PATH` | Hidden or secure subpath for sensitive Firebase operations |
| `HASH_KEY` | Cryptographic key for hashing user IPs or identifiers |
| `ADMIN_KEY` | Private key for verifying, listing, or deleting data |
| `MONITORING_KEY` | Key for secure service status monitoring |

Once configured, add secrets to Cloudflare Workers:

```bash
wrangler secret put FIREBASE_HOST_LINK
wrangler secret put FIREBASE_HIDDEN_PATH
wrangler secret put HASH_KEY
wrangler secret put ADMIN_KEY
wrangler secret put MONITORING_KEY
```

> For more details: [https://developers.cloudflare.com/workers/configuration/secrets/](https://developers.cloudflare.com/workers/configuration/secrets/)

#### Security notes:

- ⚠️ **Admin and monitoring keys:** constant-time comparison prevents timing attacks. Keep keys strong (60+ characters with uppercase, lowercase, numbers). Network latency combined with rate limiting makes timing attacks extremely difficult.

- **Firebase hidden path:** use only uppercase and lowercase letters. Avoid special characters to ensure proper functionality.

### Software configuration: [`config.ts`](../config.ts)

```ts
export const config: StaticConfig = {

	RATE_LIMIT_INTERVAL_S: 1,             // min = 1
	
	MAX_DAILY_WRITES: 10,                 // min = 1
	
	IPS_PURGE_TIME_DAYS: 1,               // min = 1
	
	FIREBASE_TIMEOUT_MS: 6000,            // min = 1000
	
	FIREBASE_ENTRIES_LIMIT: 1000,         // min = 50

    USER_AGENT: "NSH/1.0 (Serverless URL Shortener; repo=https://github.com/Nde-Code/NSH)", // required
	
	DEFAULT_NUMBER_OF_LINKS_FROM_COUNT: 15, // min = 5
	
	MAX_NUMBER_OF_LINKS_COUNT: 50,        // min = 10
	
	SHORT_URL_ID_LENGTH: 14,              // min = 10
	
	MAX_URL_LENGTH: 2000                  // min = 100

};
```

#### Configuration parameters:

| Parameter | Description | Constraints |
|-----------|-------------|-------------|
| `RATE_LIMIT_INTERVAL_S` | Rate limit interval in seconds | Minimum: 1 |
| `MAX_DAILY_WRITES` | Daily write limit (new links only) | Minimum: 1 |
| `IPS_PURGE_TIME_DAYS` | Days before purging hashed IPs from KV | Minimum: 1 |
| `FIREBASE_TIMEOUT_MS` | HTTP request timeout for Firebase (milliseconds) | Minimum: 1000 |
| `USER_AGENT` | The HTTP User-Agent string used when performing Firebase REST API requests. | Required |
| `FIREBASE_ENTRIES_LIMIT` | Maximum entries allowed in Firebase | Minimum: 50 |
| `DEFAULT_NUMBER_OF_LINKS_FROM_COUNT` | Default links returned if no `count` specified | Minimum: 5, max: `MAX_NUMBER_OF_LINKS_COUNT` |
| `MAX_NUMBER_OF_LINKS_COUNT` | Maximum links retrievable via `count` parameter | Minimum: 10, max: `FIREBASE_ENTRIES_LIMIT` |
| `SHORT_URL_ID_LENGTH` | Length of generated shortcodes | Minimum: 10 |
| `MAX_URL_LENGTH` | Maximum allowed URL length | Minimum: 100 |

#### Important notes:

- **Request body limit:** a 10KB JSON payload limit is enforced for security when posting new URLs. This is hard-coded and can be modified in source code.

- **Entry limit & collision prevention:** short IDs use a deterministic 32-bit hash (4.29 billion possible values). By the birthday paradox, collisions become significant around √(2^32) ≈ 65,000 entries. To keep collision probability negligible and avoid insertion failures, `FIREBASE_ENTRIES_LIMIT` caps database size. Keeping stored URLs ≤ 10,000 ensures extremely low collision risk while controlling free-tier resource usage.

- **Constraint validation:** violating these constraints will trigger configuration errors.

## 💻 Project setup:

### 1. Create Firebase Realtime Database:

1. Go to [firebase.google.com](https://firebase.google.com/) and create an account
   > Google account required (or create one)

2. Create a **project** and set up a **Realtime Database**
   > See [Firebase documentation](https://firebase.google.com/docs/build?hl=en) if needed

3. Go to the **Rules** tab and paste this configuration:

```js
{
    "rules": {
        "YOUR_SECRET_PATH": {
            ".read": false,
            ".write": false,
            "meta": {
                ".write": "newData.hasChild('_url_counter')",
                "_url_counter": {
                    ".read": true,
                    ".validate": "newData.isNumber() && newData.val() >= 0"
                }
            },
            "urls": {
                ".read": true,
                "$shortcode": {
                    ".write": "(!data.exists() && newData.exists()) || (data.exists() && !newData.exists()) || (data.exists() && newData.exists() && data.child('long_url').val() === newData.child('long_url').val() && data.child('post_date').val() === newData.child('post_date').val())",
                    ".validate": "(!newData.exists()) || (newData.child('is_verified').isBoolean() && newData.child('long_url').isString() && newData.child('long_url').val().length <= 2000 && newData.child('long_url').val().matches(/^(ht|f)tp(s?):\\/\\/[0-9a-zA-Z]([\\-\\.\\w]*[0-9a-zA-Z])*(?::[0-9]+)?(\\/.*)?$/) && newData.child('post_date').isString() && newData.child('post_date').val().matches(/^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{3})?Z$/))",
                    "long_url": {
                        ".validate": "newData.isString() && newData.val().length <= 2000"
                    },
                    "post_date": {
                        ".validate": "newData.isString()"
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
}
```

#### Security rules summary:

| Action | Condition |
|--------|-----------|
| **Read** | Allowed for `meta/_url_counter` and `urls/` list. Root path is private |
| **Write (Create)** | Node must not exist. Data must include `long_url` (URL format), `post_date` (ISO), and `is_verified` (boolean) |
| **Write (Counter)** | PATCH on `meta/` must contain `_url_counter`. Value must remain ≥ 0 |
| **Delete** | Allowed if node exists. Worker handles atomic counter decrement via PATCH |
| **Update (PATCH)** | Only `is_verified` can change. `long_url` and `post_date` must match existing values |
| **Validation** | URLs max 2000 chars, HTTP/HTTPS regex, ISO 8601 date format |
| **Extra Fields** | Forbidden, only `long_url`, `post_date`, `is_verified` allowed |

### 2. Initialize TypeScript types:

Enable TypeScript definitions in your editor:

```bash
wrangler types
```

> Ensure `wrangler.jsonc` is properly configured first.

Include in [`tsconfig.json`](../tsconfig.json):

```json
{
    "compilerOptions": {
        "noEmit": true,
        "allowImportingTsExtensions": true,
        "target": "ES2020",
        "lib": [
            "ES2020",
            "DOM"
        ],
        "module": "ESNext",
        "moduleResolution": "Bundler",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "types": [
            "./worker-configuration.d.ts"
        ]
    },
    "include": [
        "utilities",
        "worker-configuration.d.ts",
        "main.ts",
        "config.ts",
        "types"
    ],
    "exclude": [
        "node_modules",
        "dist"
    ]
}
```

#### TypeScript configuration explanation:

| Setting | Purpose |
|---------|---------|
| `noEmit: true` | Prevents TS from emitting JS; Wrangler handles bundling |
| `allowImportingTsExtensions: true` | Allows direct `.ts` file imports for relative paths |
| `target: "ES2020"` | Modern JavaScript syntax for Workers runtime |
| `lib: ["ES2020", "DOM"]` | Includes modern JS features and Web APIs |
| `module: "ESNext"` | ES Modules standard for Workers |
| `moduleResolution: "Bundler"` | ESM-aware module resolution for bundlers |
| `strict: true` | Enables all strict type checking |
| `esModuleInterop: true` | Facilitates CommonJS interoperability |
| `skipLibCheck: true` | Skips type checking `.d.ts` files for speed |
| `forceConsistentCasingInFileNames: true` | Prevents casing errors across OS |
| `types: ["./worker-configuration.d.ts"]` | Includes Wrangler binding definitions |
| `include` | Source code and types to check |
| `exclude` | Build artifacts and dependencies to ignore |

> This project has **no external dependencies**, no `package.json` or npm packages required.

### 3. Run and deploy:

**Start local development:**

```bash
wrangler dev
```

**Bundle for production (optional):**

```bash
wrangler build
```

**Deploy to Cloudflare Workers:**

```bash
wrangler deploy
```

Your project is now live and accessible via the provided URL.

## 📌 Support:

For issues or questions, open an issue on GitHub: [https://github.com/Nde-Code/NSH/issues](https://github.com/Nde-Code/NSH/issues)
