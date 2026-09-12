# Privacy:

## Introduction:

This privacy policy explains clearly and transparently what data this software processes and how that data is handled.

## Information collection and use:

### Rate limiting, privacy, and security:

This project implements **rate limiting** to protect the service against malicious activity and ensure that service limits are respected. There are two types of mechanisms:

- **Burst protection:** protects the service against sudden bursts and rapid repeated requests. It uses [Cloudflare Workers Cache](https://developers.cloudflare.com/workers/runtime-apis/cache/) to store the required data.

- **Daily rate limit:** protects the service against an excessive amount of new content being created. In the context of this project, this refers to the number of URLs stored in the database. It uses [Cloudflare Workers KV](https://developers.cloudflare.com/kv/) to store the required data.

To implement **rate limiting**, this software processes your **IP address**.

However, the IP address is **immediately pseudonymized**:

- It is hashed using **SHA-256**.
- It is combined with a strong, secret **SALT** stored:
  - locally in `.dev.vars`,
  - and in [Cloudflare Workers Secrets](https://developers.cloudflare.com/workers/configuration/secrets/#secrets-on-deployed-workers) in production.

Your IP address is **never logged**, stored in plain text, or saved in any external database or external service.

The hashed IP is retained **only for the time required** to apply rate limiting and is **automatically removed afterward**.

You may review the implementation in the file: [rate.ts](../utilities/rate.ts).

### Legal basis:

Processing of the hashed IP address is strictly for **protecting the service against abuse** through rate limiting.

Because the IP address is immediately transformed using a cryptographic hash and a secret salt, the resulting value is not stored in its original form and is not directly identifiable as an IP address. However, this hashed value may still be considered pseudonymized personal data under applicable data protection laws.

## Cookies:

This project does not use **cookies**, **analytics**, or **application-level tracking**.

## Service providers:

This software uses third-party services to store data required for URL shortening.

Submitted destination URLs are stored in Firebase Realtime Database to provide the URL-shortening functionality. Users are responsible for ensuring that the URLs they submit do not contain sensitive, confidential, or unnecessary personal information.

No user account information, names, email addresses, or IP addresses are intentionally stored in Firebase.

You may review Firebase's policies here:
- [https://policies.google.com/privacy](https://policies.google.com/privacy)
- [https://firebase.google.com/terms/](https://firebase.google.com/terms/)

## Link submission policy:

This URL-shortening service accepts only **legitimate, publicly accessible links**.

### Disallowed links:

- Local addresses (e.g., `localhost`, `127.0.0.1`, `::1`)
- Invalid or malformed domains
- Internal or non-public services
- Links associated with malicious, fraudulent, or illegal content

Any link that does not meet these criteria will be **automatically deleted** without notice.

## Cloudflare Workers:

The online instance of this project runs on [Cloudflare Workers](https://workers.cloudflare.com/), a serverless edge platform designed to execute code close to users.

Although IP addresses are hashed with a secret salt and retained only briefly, data may be processed and, in the case of the KV database, stored in different geographic regions, where different data protection and privacy laws may apply.

If geographic location is a concern, [Cloudflare Workers Placement](https://developers.cloudflare.com/workers/configuration/placement/) can be used to influence where your Worker executes.

The data stored in [Cloudflare Workers KV](https://developers.cloudflare.com/kv/) are globally distributed by default and may be replicated across Cloudflare's network rather than being restricted to a specific geographic region or jurisdiction. Cloudflare also offers jurisdiction-restricted KV namespaces, including the EU. However, this feature is currently in private beta and only controls where data is **durably stored**; data may still be cached outside the selected jurisdiction, and the Worker may access the namespace from anywhere. These limitations should be taken into account when geographic or privacy requirements apply. See https://developers.cloudflare.com/kv/reference/data-location/ for more details.

## Changes to this privacy policy:

This privacy policy may be updated periodically.

Any changes will be posted on this page and take effect immediately upon publication.

## Your rights:

If you wish to request the removal of the **hashed IP** associated with your usage, you may contact me.

Please note that this hash is not used to identify you and is never linked to any other data.

## Contact:

If you have any questions or suggestions regarding this privacy policy, feel free to contact me:

- Email: [nathan.debilloez@outlook.com](mailto:nathan.debilloez@outlook.com)
- Website: [https://nde-code.github.io/](https://nde-code.github.io/)

Thank you for your understanding.
