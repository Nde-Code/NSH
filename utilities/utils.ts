import { Config } from "../types/types.ts";

import { config } from "../config.ts";

export function isConfigValidWithMinValues(config: Config, rules: Partial<Record<keyof Config, number>>): boolean {

    for (const [key, minValue] of Object.entries(rules)) {

        const value = config[key as keyof Config];

        if (typeof value !== "number" || value < (minValue ?? 0)) return false;

    }

    return true;

}

export function printLogLine(level: "INFO" | "WARN" | "ERROR", text: string) {

    const now: Date = new Date();

    const timestamp: string = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

    console.log(`[${timestamp}][${level}] ${text}`);

}

export function extractValidID(path: string): string | false {

	const parts: string[] = path.split("/").filter(Boolean);

	const id: string | undefined = parts[1];

	if (!id) return false;

	if (!new RegExp(`^[a-zA-Z0-9_-]{${config.SHORT_URL_ID_LENGTH}}$`).test(id)) return false;

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

        const { protocol, hostname } = new URL(url);

        return ((protocol === "http:" || protocol === "https:") && !hostname.endsWith(".") && hostname.includes(".") && !hostname.split(".").some((label) => label.length === 0) && !["localhost", "127.0.0.1", "::1"].includes(hostname));
    
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

export async function sha256(input: string): Promise<string> {

	const encoder: TextEncoder = new TextEncoder();

	const data = encoder.encode(input);

	const hashBuffer: ArrayBuffer = await crypto.subtle.digest("SHA-256", data);

	return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

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