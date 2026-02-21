import { printLogLine } from "./utils.ts";

export async function putInFirebaseRTDB<T = unknown, U = unknown>(baseURLWithSecret: string, timeoutValue: number, pathTo: string, data: U): Promise<T | null> {

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const res = await fetch(url, {

            method: "PUT",

            headers: { "Content-Type": "application/json"},

            body: JSON.stringify(data),

            signal: controller.signal

        });

        if (!res.ok) return null;

        if (pathTo !== "meta/_url_counter") printLogLine("INFO", `Successfully posted new link on ${pathTo}.`);

        return (await res.json()) as T;

    } catch(_err) {

        printLogLine("ERROR", `An error happened when writing on ${pathTo}.`);

        return null;

    } finally {

        clearTimeout(timeoutId);

    }
    
}