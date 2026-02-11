import { Config } from "../types/types.ts";

import { config } from "../config.ts";

let idRegex: RegExp | null = null;

function getIdRegex(): RegExp {

    if (!idRegex) idRegex = new RegExp(`^[a-zA-Z0-9_-]{${config.SHORT_URL_ID_LENGTH}}$`);

    return idRegex;

}

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

        const minValue: number | undefined = rules[key as keyof Config];

        const value: string | number = config[key as keyof Config];

        if (typeof value !== "number" || (minValue !== undefined && value < minValue)) return false;

    }

    return true;

}

export function printLogLine(level: "INFO" | "WARN" | "ERROR", text: string): void { console.log(`[${level}] ${text}`); }

export function extractValidID(path: string): string | false {
    
    let slash: number = path.lastIndexOf("/");

    if (slash === -1) return false;

    const id: string = path.slice(slash + 1);

    if (id.length !== config.SHORT_URL_ID_LENGTH ||!getIdRegex().test(id)) return false;

    return id;

}

export function getApiKeyFromRequest(req: Request): string | null {

    const authHeader: string | null = req.headers.get("authorization");

    const xApiKey: string | null = req.headers.get("x-api-key");

    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
        
    else if (xApiKey) return xApiKey.trim();

    return null;

}

export function normalizeAndValidateURL(input: string): string | null {

    try {

        const url: URL = new URL(input.trim());

        const host: string = url.hostname;

        if ((url.protocol !== "http:" && url.protocol !== "https:") || !host.includes(".") || host.endsWith(".") || host === "localhost" || host === "127.0.0.1" || host === "::1") return null;

        url.hostname = host.toLowerCase();

        return url.href;

    } catch {

        return null;

    }
    
}

export function simpleURLHash(str: string, len = config.SHORT_URL_ID_LENGTH): string {

    let hash: number = 5381;

    let i: number = str.length;

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