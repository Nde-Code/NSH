import { StaticConfig  } from "../types/types.ts";

let idRegex: RegExp | null = null;

function getIdRegex(shortUrlIdLength: number): RegExp {

    if (!idRegex) idRegex = new RegExp(`^[a-zA-Z0-9_-]{${shortUrlIdLength}}$`);

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

export function isConfigValidWithMinValues(config: StaticConfig, rules: Partial<Record<keyof StaticConfig, number>>): boolean {

    for (const key in rules) {

        const typedKey = key as keyof StaticConfig;

        const minValue = rules[typedKey];

        const value = config[typedKey];

        if (minValue !== undefined && value < minValue) return false;

    }

    return true;

}

export function printLogLine(level: "INFO" | "WARN" | "ERROR", text: string): void { console.log(`[${level}] ${text}`); }

export function extractValidID(path: string, shortUrlIdLength: number): string | false {
    
    let slash: number = path.lastIndexOf("/");

    if (slash === -1) return false;

    const id: string = path.slice(slash + 1);

    if (id.length !== shortUrlIdLength ||!getIdRegex(shortUrlIdLength).test(id)) return false;

    return id;

}

export function getApiKeyFromRequest(req: Request): string | null {

    const authHeader: string | null = req.headers.get("authorization");

    const xApiKey: string | null = req.headers.get("x-api-key");

    if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7).trim();
        
    else if (xApiKey) return xApiKey.trim();

    return null;

}

export function constantTimeEqual(a: string, b: string): boolean {

	const maxLen: number = Math.max(a.length, b.length);

	let result: number = a.length ^ b.length;

	for (let i = 0; i < maxLen; i++) {

		const charA: number = a.charCodeAt(i) || 0;

		const charB: number = b.charCodeAt(i) || 0;

		result |= charA ^ charB;

	}

	return result === 0;

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

export function simpleURLHash(str: string, shortUrlIdLength: number): string {

    let hash: number = 5381;

    let i: number = str.length;

    while (i) {

        hash = (hash * 33) ^ str.charCodeAt(--i);

    }

    return (hash >>> 0).toString(36).padEnd(shortUrlIdLength, "0").slice(0, shortUrlIdLength);

}

export async function parseJsonBody<T = unknown>(req: Request): Promise<T | null> {

    const MAX_PAYLOAD_SIZE: number = 10000;

    try {

        const contentType: string = req.headers.get("content-type") ?? "";

        if (!contentType.includes("application/json")) return null;

        const contentLength = req.headers.get("content-length");

        if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) return null;

        const bodyText = await req.text();

        if (!bodyText || bodyText.length > MAX_PAYLOAD_SIZE) return null;

        const parsed: unknown = JSON.parse(bodyText);

        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;

        return parsed as T;

    } catch (_err) {

        return null;

    }

}
