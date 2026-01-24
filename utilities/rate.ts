import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

interface CloudflareCache {

    default: {

        match(request: Request): Promise<Response | undefined>;

        put(request: Request, response: Response): Promise<void>;

    };

}

async function safeKvPut(kv: KVNamespace, key: string, value: string, expirationTtl: number, errorMessage = "KV put failed..."): Promise<boolean> {
    
    try {

        await kv.put(key, value, { expirationTtl });

        return true;

    } catch (_err) {

        printLogLine("ERROR", errorMessage);

        return false;

    }

}

export async function checkTimeRateLimit(hashedIp: string, limitSeconds = config.RATE_LIMIT_INTERVAL_S): Promise<boolean> {
    
    const cache = caches as unknown as CloudflareCache;
    
    const cacheKey = new Request(`https://ratelimit/${hashedIp}`);

    const hit: Response | undefined = await cache.default.match(cacheKey);

    if (hit) return false;

    await cache.default.put(cacheKey,

        new Response("ok", {

            headers: { "Cache-Control": `max-age=${limitSeconds}` }

        })

    );

    return true;

}

export async function checkDailyRateLimit(kv: KVNamespace, hashedIp: string): Promise<boolean> {

    const now: number = Date.now();

    const key: string = `ip24hWindow:${hashedIp}`;

    type WindowData = { startTimestamp: number; count: number };

    const json: string | null = await kv.get(key);

    let windowData: WindowData;

    if (!json) {

        windowData = { startTimestamp: now, count: 1 };

        return await safeKvPut(kv, key, JSON.stringify(windowData), config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60, "The KV hasn't been updated to initialize the daily window.");
        
    }

    windowData = JSON.parse(json);

    if (now - windowData.startTimestamp >= config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000) {

        windowData = { startTimestamp: now, count: 1 };

        return await safeKvPut(kv, key, JSON.stringify(windowData), config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60, "The KV hasn't been updated to reset the daily window.");
    
    }

    if (windowData.count >= config.MAX_DAILY_WRITES) return false;

    windowData.count++;

    const remainingTtl = Math.floor((config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000 - (now - windowData.startTimestamp)) / 1000);

    return await safeKvPut(kv, key, JSON.stringify(windowData), remainingTtl, "The KV hasn't been updated to increment the daily counter.");

}

export async function hashIp(ip: string, salt = config.HASH_KEY): Promise<string> {

    const encoder = new TextEncoder();
    
    const data = encoder.encode(ip + salt);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

}
