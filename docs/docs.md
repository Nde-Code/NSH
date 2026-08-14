# Developer guide for setting up, configuring, developing, and deploying the project:

Complete developer guide for contributing to this project or creating your own version to run on [Cloudflare Workers](https://workers.cloudflare.com/) using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

**Note:** this project does not include a `package.json`, and it does not require any npm dependencies.

## 🚀 Getting started with GitHub Codespaces:

The project provides a pre-configured [Dev Container](https://containers.dev/) environment for [GitHub Codespaces](https://github.com/features/codespaces), making it quick and easy to start coding.

Using Codespaces is the recommended way to work on the project because it automatically sets up the required elements and provides a ready-to-code environment.

### 1. Configure the required secrets:

Before you start a new Codespaces environment and begin coding in it, you need to register the required secrets in the repository's GitHub Codespaces Secrets.

See the [environment variables](#environment-variables) section for the required configuration and the [GitHub Codespaces secrets documentation](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces) for more details.

### 2. Open the repository in GitHub Codespaces:

Open the repository on GitHub and create a new Codespace from the Code → Codespaces menu.

GitHub will automatically detect the project's `.devcontainer.json` configuration and build the development environment.

### 3. Automatic environment setup:

The `.devcontainer.json` file defines the complete development environment:

- Ubuntu-based development container

- Node.js 24

- Cloudflare Wrangler

- Required environment variables

- Generated TypeScript definitions for Cloudflare Worker bindings

The setup is executed automatically when the Codespace is created via `postCreateCommand`. The Codespace is created with environment variables that are automatically read from the Codespaces environment and written to `.dev.vars` by the dev container setup, Wrangler is installed, and types are initialized.

Wrangler is intentionally installed globally inside the Codespace to keep the repository free of Node.js project dependencies.

> **Note:** `.dev.vars` is a local development file and must never be committed to the repository. It's already been added to the `.gitignore`.

### 4. Authenticate with Cloudflare:

Once the Codespace has finished initializing, authenticate Wrangler with your Cloudflare account:

```bash
wrangler login
```

## ⚙️ Configuration setup:

Review the [`wrangler.jsonc`](../wrangler.jsonc) file, which contains the complete project configuration:

```jsonc
{
	"name": "project-name",
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
This determines your public URL (e.g., `https://project-name.your-subdomain.workers.dev`).

#### `main`

Specifies the **entry point** of your Worker script.
This file exports your main fetch handler.

#### `compatibility_date`

Locks your Worker to a specific Cloudflare Workers runtime version.
Ensures compatibility even as Cloudflare updates the platform.

#### `preview_urls`

Enables or disables preview URLs for testing.

* `true` = Enables preview URLs
* `false` = Disables preview URLs

> For more details: [https://developers.cloudflare.com/workers/configuration/previews/](https://developers.cloudflare.com/workers/configuration/previews/)

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

### KV database (for the daily rate limiting system):

#### `kv_namespaces`

Binds your Worker to **Cloudflare KV** namespace for rate limiting storage.

Create a Workers KV namespace from the Codespace using:

```bash
wrangler kv namespace create YOUR_KV_NAME
```

> For more details: [https://developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/)

Complete `wrangler.jsonc` with:

* **`binding`**: variable name used in your code (e.g., `YOUR_KV_NAME`)
* **`id`**: unique namespace ID from your Cloudflare dashboard

### Environment variables:

The Worker uses environment variables for local development and Cloudflare secrets for production.

#### Variables in this project:

| Variable | Description |
|----------|-------------|
| `FIREBASE_HOST_LINK` | Public or private Firebase endpoint for your Worker |
| `FIREBASE_HIDDEN_PATH` | Hidden or secure subpath for sensitive Firebase operations |
| `HASH_KEY` | Cryptographic key for hashing user IPs or identifiers |
| `ADMIN_KEY` | Private key for verifying, listing, or deleting data |
| `MONITORING_KEY` | Key for secure service status monitoring |

#### Local development:

Create/configure the following values as GitHub Codespaces secrets. When the Codespace is created, `.devcontainer.json` automatically writes them to `.dev.vars`:

```env
FIREBASE_HOST_LINK="YOUR_FIREBASE_URL"
FIREBASE_HIDDEN_PATH="YOUR_SECRET_PATH"
HASH_KEY="THE_KEY_USED_TO_HASH_IPS"
ADMIN_KEY="THE_ADMIN_KEY_TO_VERIFY_LIST_AND_DELETE"
MONITORING_KEY="THE_KEY_USED_FOR_MONITORING"
```

#### Production:

For the deployed Worker, configure the same values as Cloudflare Workers secrets:

```bash
wrangler secret put FIREBASE_HOST_LINK
wrangler secret put FIREBASE_HIDDEN_PATH
wrangler secret put HASH_KEY
wrangler secret put ADMIN_KEY
wrangler secret put MONITORING_KEY
```

> For more details: [https://developers.cloudflare.com/workers/configuration/secrets/](https://developers.cloudflare.com/workers/configuration/secrets/)

#### Security notes:

- **Admin and monitoring keys:** the constant-time comparison prevents timing attacks. Keep keys strong (60+ characters with uppercase, lowercase, numbers). Network latency combined with rate limiting makes timing attacks extremely difficult.

- **Firebase hidden path:** use only uppercase and lowercase letters. Avoid special characters to ensure proper functionality.

### Software configuration: [`config.ts`](../config.ts)

```ts
export const config: StaticConfig = {

	RATE_LIMIT_INTERVAL_S: 1,             // min = 1
	
	MAX_DAILY_WRITES: 10,                 // min = 1
	
	DAILY_RATE_LIMIT_RESET_DAYS: 1,       // min = 1
	
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
| `RATE_LIMIT_INTERVAL_S` | Rate limit interval in seconds | Minimum: 1 second |
| `MAX_DAILY_WRITES` | Daily write limit (new links only) | Minimum: 1 write |
| `DAILY_RATE_LIMIT_RESET_DAYS` | Days before purging hashed IPs from KV | Minimum: 1 day |
| `FIREBASE_TIMEOUT_MS` | HTTP request timeout for Firebase (milliseconds) | Minimum: 1000 ms |
| `USER_AGENT` | The HTTP User-Agent string used when performing Firebase REST API requests. Update the repository URL if you are using your own fork. | Required |
| `FIREBASE_ENTRIES_LIMIT` | Maximum entries allowed in Firebase | Minimum: 50 links |
| `DEFAULT_NUMBER_OF_LINKS_FROM_COUNT` | Default links returned if no `count` specified | Minimum: 5 links, max: `MAX_NUMBER_OF_LINKS_COUNT` links |
| `MAX_NUMBER_OF_LINKS_COUNT` | Maximum links retrievable via `count` parameter | Minimum: 10 links, max: `FIREBASE_ENTRIES_LIMIT` links |
| `SHORT_URL_ID_LENGTH` | Length of generated shortcodes | Minimum: 10 characters |
| `MAX_URL_LENGTH` | Maximum allowed URL length | Minimum: 100 characters |

#### Important notes:

- **Request body limit:** a 10KB JSON payload limit is enforced for security when posting new URLs. This is hard-coded and can be modified in source code.

- **Entry limit & collision prevention:** short IDs use a deterministic 32-bit hash (4.29 billion possible values). By the birthday paradox, collisions become significant around √(2^32) ≈ 65,000 entries. To keep collision probability negligible and avoid insertion failures, `FIREBASE_ENTRIES_LIMIT` caps database size. Keeping the database below 10,000 entries keeps the probability of a hash collision relatively low, while also limiting free-tier resource usage.

- **Constraint validation:** violating constraints will trigger configuration errors.

## 💻 Project setup:

Once your Codespace is ready and your Cloudflare account is authenticated, complete step 1 about creating your Firebase Realtime Database. Then this section simply resumes step 2 to initialize the types and run the command to start the project in step 3.

### 1. Create Firebase Realtime Database (to store the links):

1. Go to [firebase.google.com](https://firebase.google.com/) and sign in with a Google account. 

2. Create a **project** and set up a **Realtime Database** (see: [Firebase documentation](https://firebase.google.com/docs/build?hl=en) if needed).

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
| **Read** | Allowed for `meta/_url_counter` and `urls/` list. The Firebase root and unspecified paths remain private by default. |
| **Write (Create)** | Node must not exist. Data must include `long_url` (URL format), `post_date` (ISO), and `is_verified` (boolean) |
| **Write (Counter)** | PATCH on `meta/` must contain `_url_counter`. Value must remain ≥ 0 |
| **Delete** | Allowed if node exists. Worker handles atomic counter decrement via PATCH |
| **Update (PATCH)** | Only `is_verified` can change. `long_url` and `post_date` must match existing values |
| **Validation** | URLs max 2000 chars, HTTP/HTTPS regex, ISO 8601 date format |
| **Extra Fields** | Forbidden, only `long_url`, `post_date`, `is_verified` allowed |

### 2. TypeScript types:

The Dev Container automatically runs `wrangler types` when the Codespace is created, generating the Worker bindings in `worker-configuration.d.ts` (in this project, the only binding is the KV database).

If you change your Wrangler configuration or bindings, regenerate the definitions manually with:

```bash
wrangler types
```

> Ensure `wrangler.jsonc` is properly configured before regenerating the types.

This generates TypeScript type definitions, which are already included in [`tsconfig.json`](../tsconfig.json):

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

### 3. Run and deploy:

#### Start local development:

```bash
wrangler dev
```

#### Deploy to Cloudflare Workers:

> Make sure your Cloudflare Workers secrets have been configured before deploying. See [environment variables](#environment-variables).

```bash
wrangler deploy
```

If the Worker is configured with a `workers.dev` deployment, Wrangler will display the deployed URL.

## 📌 Support:

For issues or questions, open an [issue on GitHub](https://github.com/Nde-Code/NSH/issues).
