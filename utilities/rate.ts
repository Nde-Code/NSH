import { printLogLine } from "./utils.ts";

export type RateLimitResult = "OK" | "USER_LIMIT" | "KV_QUOTA_EXCEEDED";

interface RateLimitData {s: number; c: number; }

const SECONDS_IN_DAY: number = 86400;

async function safeKvPut(kv: KVNamespace, key: string, value: string, expirationTtl: number, errorMessage = "KV put failed..."): Promise<boolean> {
    
    try {

        const ttl: number = Math.max(expirationTtl, 60);

        await kv.put(key, value, { expirationTtl: ttl });

        return true;

    } catch (_err) {

        printLogLine("ERROR", errorMessage);

        return false;

    }
    
}

export async function checkTimeRateLimit(hashedIp: string, limitSeconds: number): Promise<boolean> {
    
    const cache = (caches as any).default;

    const cacheKey: string = `https://ratelimit.local/${hashedIp}`;

    const hit = await cache.match(cacheKey);

    if (hit) return false;

    await cache.put(cacheKey, new Response("1", {

        headers: { "Cache-Control": `max-age=${limitSeconds}` }

    }));

    return true;

}

export async function checkDailyRateLimit(kv: KVNamespace, hashedIp: string, maxWrites: number, purgeDays: number): Promise<RateLimitResult> {

    const now: number = Date.now();

    const key: string = `ip24h:${hashedIp}`;

    const windowMs: number = purgeDays * SECONDS_IN_DAY * 1000;

    let json: string | null;

    try {

        json = await kv.get(key);

    } catch {

        return "KV_QUOTA_EXCEEDED";

    }

    if (!json) {

        const success: boolean = await safeKvPut(kv, key, JSON.stringify({ s: now, c: 1 }), purgeDays * SECONDS_IN_DAY);
        
        return success ? "OK" : "KV_QUOTA_EXCEEDED";

    }

    const data = JSON.parse(json) as RateLimitData;

    if (now - data.s >= windowMs) {

        const success: boolean = await safeKvPut(kv, key, JSON.stringify({ s: now, c: 1 }), purgeDays * SECONDS_IN_DAY);
        
        return success ? "OK" : "KV_QUOTA_EXCEEDED";

    }

    if (data.c >= maxWrites) return "USER_LIMIT";

    data.c++;

    const remainingTtl: number = Math.floor((windowMs - (now - data.s)) / 1000);

    const success: boolean = await safeKvPut(kv, key, JSON.stringify(data), remainingTtl);

    return success ? "OK" : "KV_QUOTA_EXCEEDED";
}

export async function hashIp(ip: string, salt: string): Promise<string> {

    const msgBuffer = new TextEncoder().encode(ip + salt);

    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

    const hashArray = new Uint8Array(hashBuffer);
    
    let hexString = "";

    for (let i = 0; i < hashArray.length; i++) {

        const b: number = hashArray[i];

        hexString += (b < 16 ? '0' : '') + b.toString(16);

    }

    return hexString;
    
}