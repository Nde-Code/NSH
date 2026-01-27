import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

interface CloudflareCache {

    default: {

        match(request: Request): Promise<Response | undefined>;

        put(request: Request, response: Response): Promise<void>;

    };

}

export type RateLimitResult = "OK" | "USER_LIMIT" | "KV_QUOTA_EXCEEDED";

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
                
            }

        ));

    return true;

}

export async function checkDailyRateLimit(kv: KVNamespace, hashedIp: string): Promise<RateLimitResult> {

    const now: number = Date.now();

    const key: string = `ip24hWindow:${hashedIp}`;

    type WindowData = { startTimestamp: number; count: number };

    let json: string | null;

    try {

        json = await kv.get(key);

    } catch {

        printLogLine("ERROR", "KV read failed (possible quota reached)");

        return "KV_QUOTA_EXCEEDED";

    }

    let windowData: WindowData;

    if (!json) {

        windowData = { startTimestamp: now, count: 1 };

        const success = await safeKvPut(kv, key, JSON.stringify(windowData), config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60, "KV put failed initializing daily window");
        
        return success ? "OK" : "KV_QUOTA_EXCEEDED";

    }

    windowData = JSON.parse(json);

    if (now - windowData.startTimestamp >= config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000) {

        windowData = { startTimestamp: now, count: 1 };

        const success: boolean = await safeKvPut(kv, key, JSON.stringify(windowData), config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60, "KV put failed resetting daily window");
        
        return success ? "OK" : "KV_QUOTA_EXCEEDED";

    }

    if (windowData.count >= config.MAX_DAILY_WRITES) return "USER_LIMIT";

    windowData.count++;

    const remainingTtl = Math.floor((config.IPS_PURGE_TIME_DAYS * 24 * 60 * 60 * 1000 - (now - windowData.startTimestamp)) / 1000);

    const success: boolean = await safeKvPut(kv, key, JSON.stringify(windowData), remainingTtl, "KV put failed incrementing daily counter");

    return success ? "OK" : "KV_QUOTA_EXCEEDED";

}

export async function hashIp(ip: string, salt = config.HASH_KEY): Promise<string> {

    const encoder = new TextEncoder();

    const data = encoder.encode(ip + salt);

    const hashBuffer = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");

}
