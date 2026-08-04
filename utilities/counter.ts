import { printLogLine } from "./utils.ts";

export async function updateFirebaseCounter(baseURLWithSecret: string, timeoutValue: number, userAgent: string, pathTo: string, step: number): Promise<boolean> {

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const res = await fetch(url, {

            "method": "PATCH",

            "headers": {
                
                "Content-Type": "application/json",
                
                "User-Agent": userAgent
            
            },

            "body": JSON.stringify({ "_url_counter": { ".sv": { "increment": step } } }),

            "signal": controller.signal

        });

        return res.ok;

    } catch (_err) {

        printLogLine("ERROR", "An error occurred while trying to update the Firebase links counter.");

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}