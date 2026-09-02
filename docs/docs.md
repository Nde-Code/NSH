# Developer guide for setting up, configuring, developing, and deploying the project:

Complete developer guide for contributing to this project or creating your own version to run on [Cloudflare Workers](https://workers.cloudflare.com/) using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

> **Note:** this project does not include a `package.json`, and it does not require any npm dependencies.

## 🚀 Getting started with GitHub Codespaces:

The project provides a pre-configured [Dev Container](https://containers.dev/) environment for [GitHub Codespaces](https://github.com/features/codespaces), making it quick and easy to start coding.

Using Codespaces is the recommended way to work on the project because it automatically sets up the required elements and provides a ready-to-code environment.

### 0. Fork the repository:

First, create a fork of the repository by following: [https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo](https://docs.github.com/en/pull-requests/how-tos/work-with-forks/fork-a-repo).

You will obtain a repository containing your own copy of the project on your GitHub account, which allows you to use the project, make modifications, and share them with me via a pull request if you wish.

### 1. Configure the required secrets:

Before you start a new Codespaces environment and begin coding in it, you need to register the required secrets in the repository's GitHub Codespaces secrets.

See the [environment variables](#environment-variables) section for the required configuration and the [GitHub Codespaces documentation about secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces) for more details.

### 2. Open the repository in GitHub Codespaces:

Open the repository on GitHub and create a new Codespace from the Code → Codespaces menu.

GitHub will automatically detect the project's [`.devcontainer.json`](../.devcontainer.json) configuration and build the development environment.

### 3. Automatic environment setup:

The [`.devcontainer.json`](../.devcontainer.json) file:

```json
{
    "name": "NSH Codespaces setup script",
    "image": "mcr.microsoft.com/devcontainers/base:ubuntu",
    "features": {
        "ghcr.io/devcontainers/features/node:1": {
            "version": "24"
        }
    },
    "postCreateCommand": "npm install -g wrangler && echo \"FIREBASE_REALTIME_DATABASE_URL=\\\"$FIREBASE_REALTIME_DATABASE_URL\\\"\" > .dev.vars && echo \"FIREBASE_HIDDEN_PATH=\\\"$FIREBASE_HIDDEN_PATH\\\"\" >> .dev.vars && echo \"IP_HASH_SALT=\\\"$IP_HASH_SALT\\\"\" >> .dev.vars && echo \"ADMIN_KEY=\\\"$ADMIN_KEY\\\"\" >> .dev.vars && echo \"MONITORING_KEY=\\\"$MONITORING_KEY\\\"\" >> .dev.vars && wrangler types",
    "remoteUser": "vscode"
}
```

defines the Codespace development environment:

| Component | Configuration |
|---|---|
| **Base image** | Ubuntu-based development container |
| **Node.js** | Version `24` |
| **Cloudflare Wrangler** | Latest version, with `v4` or later required |
| **Environment variables** | Populated from the Codespaces environment and written to `.dev.vars` |
| **TypeScript definitions** | Generated with `wrangler types` for [Cloudflare Worker Bindings](https://developers.cloudflare.com/workers/runtime-apis/bindings/) |
| **Remote user** | `vscode` |

The `postCreateCommand` automatically performs the required setup when the Codespace is created.

Wrangler is intentionally installed globally inside the Codespace to keep the repository free of Node.js project dependencies.

> **Note:** `.dev.vars` is a local development file and must never be committed to the repository. It is already included in [`.gitignore`](../.gitignore).

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
    "compatibility_date": "2026-08-12",
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
    "placement": {
        "mode": "smart"
    },
    "kv_namespaces": [
        {
            "binding": "RATE_LIMIT_KV",
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

### Worker execution location:

#### `placement`

Controls where Cloudflare executes your Worker using [Cloudflare Workers Placement](https://developers.cloudflare.com/workers/configuration/placement/).

When `mode` is set to `"smart"`, Cloudflare automatically determines the most suitable location to run your Worker based on its execution patterns and backend interactions.

This can reduce latency for Workers that communicate with external services, APIs, databases, or other resources that are geographically distant from the default execution location.

* `"smart"` = Enables Smart Placement
* `"off"` = Disables Worker placement optimization

> Smart Placement requires sufficient traffic for Cloudflare to analyze the Worker and determine whether moving its execution location provides a performance benefit. The placement decision may take some time after deployment and can change as traffic patterns evolve.

### KV database *(for the daily rate limiting system)*:

#### `kv_namespaces`

Binds your Worker to [Cloudflare Workers KV](https://developers.cloudflare.com/kv/) for rate limiting storage.

Create a Workers KV namespace from the Codespace using:

```bash
wrangler kv namespace create RATE_LIMIT_KV
```

> **Note:** `RATE_LIMIT_KV` in the command above is the KV namespace name and can be chosen freely. The `binding` must match the variable name used in the Worker code (`env.RATE_LIMIT_KV`).

Complete [`wrangler.jsonc`](../wrangler.jsonc) with:

| Property      | Description                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| **`binding`** | The variable name used in the code is `RATE_LIMIT_KV`, so **do not change this value** (*no change required*) |
| **`id`**      | The unique namespace ID provided by Wrangler in the command output or available in your Cloudflare dashboard  |

### Environment variables:

The Worker uses standard environment variables in a `.dev.vars` file for local development and [Cloudflare Workers Secrets for deployed Workers](https://developers.cloudflare.com/workers/configuration/secrets/#secrets-on-deployed-workers) in production.

#### Variables in this project:

| Variable | Description |
|----------|-------------|
| `FIREBASE_REALTIME_DATABASE_URL` | Public or private Firebase Realtime Database endpoint (e.g. `https://<project-id>-default-rtdb.<region>.firebasedatabase.app`) |
| `FIREBASE_HIDDEN_PATH` | Hidden or secure subpath for sensitive Firebase operations |
| `IP_HASH_SALT` | Cryptographic salt for hashing user IP addresses |
| `ADMIN_KEY` | Private key for verifying, listing, resynchronizing, or deleting data |
| `MONITORING_KEY` | Key for secure service status monitoring or resynchronizing |

#### Local development:

Create/configure the following values as [GitHub Codespaces secrets](https://docs.github.com/en/codespaces/managing-your-codespaces/managing-your-account-specific-secrets-for-github-codespaces). When the Codespace is created, [`.devcontainer.json`](../.devcontainer.json) automatically writes them to `.dev.vars`:

```env
FIREBASE_REALTIME_DATABASE_URL="YOUR_FIREBASE_REALTIME_DATABASE_URL"
FIREBASE_HIDDEN_PATH="YOUR_SECRET_PATH"
IP_HASH_SALT="THE_KEY_USED_TO_HASH_IPS"
ADMIN_KEY="THE_ADMIN_KEY_TO_VERIFY_LIST_AND_DELETE"
MONITORING_KEY="THE_KEY_USED_FOR_MONITORING"
```

#### Production:

For the deployed Worker, configure the same values as [Cloudflare Workers Secrets for deployed Workers](https://developers.cloudflare.com/workers/configuration/secrets/#secrets-on-deployed-workers):

> **Note:** copy and paste the following commands one at a time.

```bash
wrangler secret put FIREBASE_REALTIME_DATABASE_URL
wrangler secret put FIREBASE_HIDDEN_PATH
wrangler secret put IP_HASH_SALT
wrangler secret put ADMIN_KEY
wrangler secret put MONITORING_KEY
```

#### Security notes:

| Variable | Requirements |
|---|---|
| `FIREBASE_HIDDEN_PATH` | Use a strong value with at least **45 characters**, including uppercase and lowercase letters and numbers **only** (no special characters) |
| `IP_HASH_SALT` | Use a strong value with at least **30 characters**, including uppercase and lowercase letters and numbers |
| `ADMIN_KEY` | Use a strong value with at least **30 characters**, including uppercase and lowercase letters and numbers |
| `MONITORING_KEY` | Use a strong value with at least **30 characters**, including uppercase and lowercase letters and numbers |

> `FIREBASE_HIDDEN_PATH`, `IP_HASH_SALT`, `ADMIN_KEY`, and `MONITORING_KEY` are sensitive secrets and must be handled with extreme caution. You may use scripts or tools to generate them, but make sure you never leak, log, or expose them.

### Software configuration:

Take a look at the [`config.ts`](../config.ts) file at the root of the project, which looks like:

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

| Parameter | Description | Constraint(s) |
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

- **Entry limit & collision prevention:** I use DJB2 to hash URLs and generate unique IDs, preventing duplicate database entries. `FIREBASE_ENTRIES_LIMIT` caps the database at the configured value, keeping hash-collision risk low and limiting free-tier resource usage.

- **Constraint validation:** violating constraints will trigger configuration errors.

## 💻 Project setup:

Once your Codespace is ready and your Cloudflare account is authenticated, complete step 1 about creating your Firebase Realtime Database. Then this section simply resumes step 2 to initialize the types and run the command to start the project in step 3.

### 1. Create Firebase Realtime Database *(to store the links)*:

1. Go to [firebase.google.com](https://firebase.google.com/) and sign in with a Google account.

2. Create a **project** and set up a **Realtime Database** (see: [https://firebase.google.com/docs/build?hl=en](https://firebase.google.com/docs/build?hl=en) if needed).

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

| Action             | Condition                                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Read**           | Allowed only for `meta/_url_counter` and the `urls/` collection, while the database root and all unspecified paths remain private                                   |
| **Create**         | Allowed only when the shortcode does not already exist and the new node contains a valid `long_url`, `post_date`, and `is_verified` value                           |
| **Counter update** | Allowed only when `_url_counter` is included in the updated `meta/` data and its value is a number greater than or equal to `0`                                     |
| **Delete**         | Allowed when the shortcode already exists, with the Worker responsible for updating the URL counter after deletion                                                  |
| **Update**         | Allowed only when the existing `long_url` and `post_date` remain unchanged, effectively allowing only `is_verified` to be modified                                  |
| **Validation**     | Requires `long_url` to be a valid HTTP/HTTPS URL of at most 2000 characters, `post_date` to use the expected ISO 8601 UTC format, and `is_verified` to be a boolean |
| **Extra fields**   | Forbidden, with only `long_url`, `post_date`, and `is_verified` allowed under each `urls/$shortcode` node                                                           |

### 2. TypeScript types:

The Dev Container automatically runs `wrangler types` when the Codespace is created, generating the TypeScript definitions required by the Worker in `worker-configuration.d.ts`.

> This project currently has one binding configured: the [KV namespace](#kv-database-for-the-daily-rate-limiting-system).

If you change your Wrangler configuration or bindings, regenerate the definitions manually with:

```bash
wrangler types
```

> Ensure [`wrangler.jsonc`](../wrangler.jsonc) is properly configured before regenerating the types.

The generated definitions are automatically picked up by TypeScript through the `types` option in [`tsconfig.json`](../tsconfig.json):

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
        "verbatimModuleSyntax": true,
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

| Setting                                  | Purpose                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------- |
| `noEmit: true`                           | Prevents TypeScript from emitting JavaScript locally; Wrangler handles bundling             |
| `allowImportingTsExtensions: true`       | Allows direct `.ts` file imports for relative paths                                         |
| `target: "ES2020"`                       | Uses modern JavaScript syntax supported by the Workers runtime                              |
| `lib: ["ES2020", "DOM"]`                 | Includes modern JavaScript features and Web APIs such as `fetch`, `Request`, and `Response` |
| `module: "ESNext"`                       | Uses the ES Modules standard for Workers                                                    |
| `moduleResolution: "Bundler"`            | Configures module resolution for bundler-based ESM environments                             |
| `verbatimModuleSyntax: true`             | Preserves module syntax as written and requires explicit `import type` for type-only imports |
| `strict: true`                            | Enables strict type-checking for safer code                                                 |
| `esModuleInterop: true`                   | Facilitates interoperability with CommonJS modules                                          |
| `skipLibCheck: true`                      | Skips type checking for `.d.ts` files to speed up compilation                               |
| `forceConsistentCasingInFileNames: true` | Prevents file casing errors across operating systems                                        |
| `types: ["./worker-configuration.d.ts"]` | Loads the TypeScript definitions generated by Wrangler                                      |
| `include`                                | Specifies the source files and types to type-check                                          |
| `exclude`                                | Specifies build artifacts and dependencies to ignore                                        |

### 3. Run and deploy:

#### Start local development:

```bash
wrangler dev
```

#### Deploy to Cloudflare Workers:

> Make sure your [Cloudflare Workers Secrets (for deployed Workers)](https://developers.cloudflare.com/workers/configuration/secrets/#secrets-on-deployed-workers) have been configured before deploying (see [environment variables](#environment-variables)).

```bash
wrangler deploy
```

If the Worker is configured to use a `workers.dev` subdomain, Wrangler will display the deployed URL.

## 📌 Support:

For issues or questions, open an [issue on GitHub](https://github.com/Nde-Code/NSH/issues).
