import { readInFirebaseRTDB } from "./read.ts";

import { printLogLine } from "./utils.ts";

export async function syncCounterWithDb(baseURLWithSecret: string, timeoutValue: number): Promise<{ actualCount: number; success: boolean }> {

    const { data, error } = await readInFirebaseRTDB<Record<string, unknown>>(baseURLWithSecret, timeoutValue, "urls", { shallow: true });
    
    if (error) return { actualCount: 0, success: false };

    const actualCount = data ? Object.keys(data).length : 0;

    const url: string = `${baseURLWithSecret}/meta.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const res = await fetch(url, {

            method: "PATCH",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ "_url_counter": actualCount }),

            signal: controller.signal

        });
        
        return { actualCount, success: res.ok };

    } catch {

        printLogLine("ERROR", "Unable to update the url counter in metadata.");

        return { actualCount, success: false };

    } finally {

        clearTimeout(timeoutId);

    }
    
}