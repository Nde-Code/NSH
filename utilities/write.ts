import { printLogLine } from "./utils.ts";

export async function putInFirebaseRTDB<T = unknown, U = unknown>(baseURLWithSecret: string, timeoutValue: number, userAgent: string, pathTo: string, data: U): Promise<T | null> {

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const res = await fetch(url, {

            "method": "PUT",

            "headers": {

                "Content-Type": "application/json",

                "User-Agent": userAgent

            },

            "body": JSON.stringify(data),

            "signal": controller.signal

        });

        if (!res.ok) return null;

        if (pathTo !== "meta/_url_counter") printLogLine("INFO", `Link written successfully to ${pathTo}.`);

        return (await res.json()) as T;

    } catch (_err) {

        printLogLine("ERROR", `Failed to write to ${pathTo}.`);

        return null;

    } finally {

        clearTimeout(timeoutId);

    }

}