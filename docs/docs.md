# The developer documentation:

Here is the complete developer guide for anyone who wants to contribute or create their own version of this project and make it work on [Cloudflare Workers](https://workers.cloudflare.com/) using [Wrangler](https://developers.cloudflare.com/workers/wrangler/).

## 🚀 To begin:

### 1. Create or login to your cloudflare account: [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)

### 2. Install Node.js and npm: [https://nodejs.org/en/download](https://nodejs.org/en/download)

### 3. Install the Wrangler CLI using:

```bash
npm install -g wrangler
```

> If you haven't installed Wrangler globally, prefix commands with `npx`, for example `npx wrangler`. 

### 4. Clone the project branch:

```bash
git clone https://github.com/Nde-Code/MeteoritesAPI.git
```

### 5. Log your Wrangler CLI to your Cloudflare account using:

```bash
wrangler login
```

## ⚙️ Setting up the configuration:

First, create the [wrangler.jsonc](../wrangler.jsonc) file, which contains the full configuration for your project. It should look like this:
```jsonc
{
	"name": "project_name",
	"main": "main.ts",
	"compatibility_date": "2025-10-08",
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

### Main elements:

#### **`name`**

Defines the **name of your Worker project**.
This determines the public URL for your Worker on Cloudflare (for example:
`https://project_name.username.workers.dev`).

#### **`main`**

Specifies the **entry point** of your Worker script.
This is the file that exports your main fetch handler.

#### **`compatibility_date`**

Locks your Worker to a specific version of the Cloudflare Workers runtime.
This ensures your code continues to work as expected, even if Cloudflare updates the runtime.

#### **`preview_urls`**

It’s used to create a previewable URL. That’s a feature in Cloudflare Workers, but it’s not really useful for a small project. Feel free to take a look at: [https://developers.cloudflare.com/workers/configuration/previews/](https://developers.cloudflare.com/workers/configuration/previews/)

### Observability:

#### **`observability.enabled`**

When set to `true`, enables **automatic metrics and logs collection** for your Worker.
This lets you monitor performance and errors in the Cloudflare dashboard.

#### **`observability.head_sampling_rate`**

Defines the **percentage of requests sampled for tracing** (from `0` to `1`).

* `1` = 100% of requests are sampled (useful for debugging).
* `0.1` = 10% of requests are traced (better for production environments).

#### **`observability.logs.invocation_logs`**

Controls whether **automatic invocation logs** are collected for each Worker execution.

* `true` (default) = Cloudflare logs metadata like request method, URL, headers, and execution details.
* `false` = Disables automatic logs, keeping only your custom `console.log` entries.

> Disabling invocation logs is recommended for **GDPR compliance**, as it prevents Cloudflare from storing potentially sensitive request data.

#### **`observability.tracing.enabled`**

Controls whether **distributed tracing** is enabled for your Worker.

* `true` = Enables tracing spans and trace IDs for each request (requires compatible tracing backend).
* `false` = Disables tracing entirely.

> Tracing is disabled by default. If you're not using OpenTelemetry or a tracing system, leave this off to reduce data collection.

### KV Namespaces:

#### **`kv_namespaces`**

Binds your Worker to your **Cloudflare KV (Key-Value)** namespace.

Create a Workers KV via the dashboard or using:
```bash
wrangler kv namespace create YOUR_KV_NAME
```

> If you feel stuck, take a look at: [https://developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/)

And complete the `wrangler.jsonc` file with the following configuration:

* **`binding`**: The variable name you’ll use inside your code (here: `YOUR_KV_NAME`).
* **`id`**: The unique namespace ID from your Cloudflare dashboard.

### Environment Variables:

To start working **locally** with environment variables, create a file called `.dev.vars` and add the following content:

```env
FIREBASE_HOST_LINK="YOUR_FIREBASE_URL"
FIREBASE_HIDDEN_PATH="YOUR_SECRET_PATH"
HASH_KEY="THE_KEY_USED_TO_HASH_IPS"
ADMIN_KEY="THE_ADMIN_KEY_TO_DELETE_AND_VERIFY"
```

**List of variables in this project:**

| Variable               | Description                                                           |
| ---------------------- | --------------------------------------------------------------------- |
| `FIREBASE_HOST_LINK`   | The public or private Firebase endpoint used by your Worker.          |
| `FIREBASE_HIDDEN_PATH` | A hidden or secure subpath for sensitive Firebase operations.         |
| `HASH_KEY`             | The cryptographic key used to hash user IPs or sensitive identifiers. |
| `ADMIN_KEY`            | A private admin key used to verify or delete data.          |

When you have finished, **make sure there are no traces of secrets** in your code, and run the following command.  
*(Normally, you'll only need to do this once, when you first create the project.)*

```bash
wrangler secret put FIREBASE_HOST_LINK
wrangler secret put FIREBASE_HIDDEN_PATH
wrangler secret put HASH_KEY
wrangler secret put ADMIN_KEY
```

to send your secret to the Cloudflare Workers platform.

> Check out [https://developers.cloudflare.com/workers/configuration/secrets/](https://developers.cloudflare.com/workers/configuration/secrets/) if you need further information.

### Software configuration file [config.ts](../config.ts):

```ts
export const config: Config = {

  FIREBASE_URL: "",

  FIREBASE_HIDDEN_PATH: "",

  HASH_KEY: "",

  ADMIN_KEY: "",

  LANG_CODE: 'en',
    
  RATE_LIMIT_INTERVAL_S: 1,

  MAX_DAILY_WRITES: 10,

  IPS_PURGE_TIME_DAYS: 1,

  FIREBASE_TIMEOUT_MS: 6000,

  FIREBASE_ENTRIES_LIMIT: 1000,

  SHORT_URL_ID_LENGTH: 14,

  MAX_URL_LENGTH: 2000

};
```

- **FIREBASE_URL**, **FIREBASE_HIDDEN_PATH**, **HASH_KEY**, **ADMIN_KEY**: These are values read from the `.env` file, so please **do not modify them**.

- **LANG_CODE**: Supported language translations are available for responses. Currently, the following languages are supported:

  - `fr` = `Français` 

  - `en` = `English` (Currently)

- **RATE_LIMIT_INTERVAL_S** in [second]: This is the rate limit based on requests.
  - **Currently**:
    - **Max**: one request per second.

- **MAX_DAILY_WRITES** in [day]: Daily writing rate limit (only applies if the link is not already in the database).
  - **Currently**:
    - **Max**: 10 writes per day.

- **IPS_PURGE_TIME_DAYS** in [day]: The number of days before purging the `Deno.kv` store that contains hashed IPs used for rate limiting.
  - **Currently**:
    - **Default**: 1 day.

- **FIREBASE_TIMEOUT_MS** in [millisecond]: The timeout limit for HTTP requests to the Firebase Realtime Database.
  - **Currently**:
    - **Max**: 6 seconds before timeout.

- **FIREBASE_ENTRIES_LIMIT**: The maximum number of entries allowed in your Firebase Realtime Database.
  - **Currently**:
    - **Max**: 1000 entries.

- **SHORT_URL_ID_LENGTH**: The length of the shortcode used for shortened URLs. You should probably not change this value to ensure no collisions occur with `sha256`.
  - **Currently**: 
    - **Default**: 14 characters.

- **MAX_URL_LENGTH**: The maximum allowed URL length in the Firebase Realtime Database.
  - **Currently**: 
    - **Max**: 2000 characters.

> Ensure that you respect the `min` value specified in the comment; otherwise, you will get an error message with your configuration.

## 💻 Setting up the project from sources:

### 1. Create a Firebase Realtime Database to store the links:

1. Go to [firebase.google.com](https://firebase.google.com/) and create an account.  
   > *(If you already have a Google account, you're good to go.)*

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

### 2. Initialize TypeScript types:

To benefit from TypeScript definitions in your editor and avoid compilation errors, you can add the Cloudflare Workers type definitions by running:

```bash
wrangler types
```

> Be sure that your `wrangler.jsonc` is correctly configured before running this command.

⚠️ **Note:** Cloudflare mentions that you can share this file with others: [https://developers.cloudflare.com/workers/languages/typescript/](https://developers.cloudflare.com/workers/languages/typescript/).  
However, I once checked this file before committing and found secrets inside (may be due to a mistake I made), so be cautious when planning to share it.

and put in `tsconfig.json`: 

> already done, if you've cloned the project so you don't need to do that.

```json
{
  "compilerOptions": {
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "types": ["./worker-configuration.d.ts"]
  },
  "include": ["utilities", "worker-configuration.d.ts", "main.ts", "config.ts", "types"],
  "exclude": ["node_modules", "dist"]
}
```

Here's a brief summary of what the `tsconfig.json` file do:

* **`noEmit: true`**
  Prevents TypeScript from emitting compiled JS files locally. The build and bundling is handled by **Wrangler/esbuild**, so this is only for type checking.

* **`allowImportingTsExtensions: true`**
  Allows importing `.ts` files directly, which is required for Deno-style and relative imports.

* **`target: "ES2020"`**
  Uses modern JavaScript syntax supported by the Worker runtime.

* **`lib: ["ES2020", "DOM"]`**
  Includes modern JS features (`ES2020`) and standard Web APIs (`DOM`) like `fetch`, `Request`, and `Response`.

* **`module: "ESNext"`**
  Uses ES Modules, which is the standard for Workers and modern TypeScript projects.

* **`moduleResolution: "Node"`**
  Tells TypeScript/IDE how to resolve modules.

  * Not strictly needed for relative `.ts` imports (they work anyway).
  * Useful if you later add npm packages: TypeScript and VS Code will correctly locate modules.
  * Does **not affect the final bundle**; esbuild handles module resolution.

* **`strict: true`**
  Enables all strict type checking options for safer, more predictable code.

* **`esModuleInterop: true`**
  Facilitates interoperability with CommonJS modules if needed.

* **`skipLibCheck: true`**
  Skips type checking for `.d.ts` files in dependencies to speed up compilation.

* **`forceConsistentCasingInFileNames: true`**
  Prevents file casing errors across different operating systems.

* **`types: ["./worker-configuration.d.ts"]`**
  Includes type definitions for Wrangler bindings (KV, R2, Durable Objects, ...).

* **`include`**
  Files/folders that TypeScript will type check: project source code and types.

* **`exclude`**
  Ignored folders: build artifacts (`dist`), dependencies (`node_modules`).

This project doesn't rely on any external libraries or dependencies, so there's no `package.json` or npm-related files.

### 3. Run the project and deploy it once it's ready:

To run locally, run:

```bash
wrangler dev
```

> If everything works correctly, that indicates your code is now compatible with Cloudflare Workers.

To bundle the project **(optional)**, run:

```bash
wrangler build
```

And in the end, to deploy in the Workers network, run:

```bash
wrangler deploy
```

and your project is now deployed and accessible to anyone with the link.

## 📌 At the end:

If you encounter any issues or problems, feel free top open an issue: [https://github.com/Nde-Code/nsh/issues](https://github.com/Nde-Code/nsh/issues)
