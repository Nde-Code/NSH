import { Config } from "../types/types.ts";

import { config } from "../config.ts";

const ID_REGEX: RegExp = new RegExp(`^[a-zA-Z0-9_-]{${config.SHORT_URL_ID_LENGTH}}$`);

export function createJsonResponse(body: object, status: number = 200, headers: HeadersInit = {}): Response {

    return new Response(JSON.stringify(body), {

        status,

        headers: {

            "Content-Type": "application/json",

            "Access-Control-Allow-Origin": "*",

            ...headers,

        },

    });

}

export function isConfigValidWithMinValues(config: Config, rules: Partial<Record<keyof Config, number>>): boolean {

    for (const key in rules) {

        const minValue = rules[key as keyof Config];

        const value = config[key as keyof Config];

        if (typeof value !== "number" || (minValue !== undefined && value < minValue)) return false;

    }

    return true;

}

export function printLogLine(level: "INFO" | "WARN" | "ERROR", text: string): void { console.log(`[${level}] ${text}`); }

export function extractValidID(path: string): string | false {

    const parts = path.split("/").filter(Boolean); 

    if (parts.length !== 2) return false;

    const id = parts[1]; 

    if (id.length !== config.SHORT_URL_ID_LENGTH || !ID_REGEX.test(id)) return false;
    
    return id;

}

export function getApiKeyFromRequest(req: Request): string | null {

    const authHeader: string | null = req.headers.get("authorization");

    const xApiKey: string | null = req.headers.get("x-api-key");

    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
        
    else if (xApiKey) return xApiKey.trim();

    return null;

}

export function isValidUrl(url: string): boolean {

    try {

        const u: URL = new URL(url);

        const host: string = u.hostname;

        return ((u.protocol === "http:" || u.protocol === "https:") && host.includes(".") && !host.endsWith(".") && !["localhost", "127.0.0.1", "::1"].includes(host));

    } catch {

        return false;

    }

}

export function normalizeURL(input: string): string | null {

    try {

        const url = new URL(input.trim());

        url.hostname = url.hostname.toLowerCase(); 
        
        return url.toString(); 
        
    } catch {

        return null;

    }

}

export function simpleURLHash(str: string, len = config.SHORT_URL_ID_LENGTH): string {

    let hash = 5381;

    let i = str.length;

    while (i) {

        hash = (hash * 33) ^ str.charCodeAt(--i);

    }

    return (hash >>> 0).toString(36).padEnd(len, "0").slice(0, len);

}

export async function parseJsonBody<T = unknown>(req: Request): Promise<T | null> {

    try {

        const contentType: string = req.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) return null;

        const bodyText: string = await req.text();

        if (!bodyText) return null;

        return JSON.parse(bodyText) as T;

    } catch (_err) {

        return null;

    }

}