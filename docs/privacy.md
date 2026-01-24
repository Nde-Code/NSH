# Privacy Policy  

## Introduction:  
To be clear and transparent about what data this software uses and how it is handled.

## Information Collection and Use: 
### Rate limiting, Privacy and Security:

To implement a `rate limiting` system, this software works with your IP address. 

However, the IP is immediately hashed using `SHA-256`, combined with a `SALT` key (strong, secret, and secure) stored in the `.env` file. Your IP is **never logged** anywhere and is only stored in a memory database called [Workers KV](https://developers.cloudflare.com/kv/). This allows the software to retain information in memory, even if the project is restarted (e.g., due to a `Cold Start`).

The IP is **never stored in any external database** or service. The `kv` database is **fully cleared every 24 hours**, which is why rate limiting is based on a **daily reset** (for better GDPR compliance), rather than on a weekly or monthly basis.

The **hashed IP** is the **only personal information** used by this project, and it's solely for security and abuse-prevention purposes. While fingerprinting could also be used, this project aims to remain as **privacy-friendly** as possible.

You can check the [rate.ts](utilities/rate.ts) file if you want to see how it works.

## Cookies: 
**No cookies**, **no analytics**, **no logs**, or **any other** data is collected by the project.

## Service Providers:  
The software uses third-party services to store data (used to shorten URLs). This is a `NoSQL` database called [Firebase Realtime Database](https://firebase.google.com/products/realtime-database).

You can read their privacy and terms here: [https://policies.google.com/privacy](https://policies.google.com/privacy) and [https://firebase.google.com/terms/](https://firebase.google.com/terms/)

## Link Submission Policy:

This URL shortening service **only accepts links from legitimate and publicly accessible websites**.

### Disallowed Links:

- Links to local addresses (e.g., `localhost`, `127.0.0.1`, `::1`, etc.).

- Links to invalid or malformed domains.

- Links to internal, non-public services.

- Links associated with malicious, fraudulent, or illegal content.

Any link that does not meet these criteria will be **automatically deleted** without notice.

## My Rights: 
I reserve the right to delete the contents of the database, any link(s), or other data at any time without prior notice.

I also reserve the right to shut down the public instance or discontinue this project at any time.

## About My Online Instance with [Cloudflare Workers](https://developers.cloudflare.com/workers/):

This branch is now hosted on Cloudflare Workers, a new free serverless platform.
 
Please note that the hashed IP data stored in the KV database may transit and be stored **outside the European Union**, specifically in the **United States**.

Even though IP addresses are hashed with a strong secret and automatically deleted every 24 hours, this data might be subject to processing in jurisdictions with different privacy laws.

If you're concerned about this, consider self-hosting the project in an EU-only environment.

## Changes to This Privacy Policy:  
I may update this Privacy Policy from time to time. You are advised to review this page periodically for any changes.

Any updates will be posted on this page and will take effect immediately upon posting.

## Contact me:  
If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact me.

Contact Information:  
Email: *nathan.debilloez@outlook.com*
