import { printLogLine } from "./utils.ts";

export async function deleteInFirebaseRTDB(baseURLWithSecret: string, timeoutValue: number, userAgent: string, pathTo: string): Promise<boolean> {

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const res = await fetch(url, {

            "method": "DELETE",

            "headers": { "User-Agent": userAgent },

            "signal": controller.signal

        });

        if (res.ok) printLogLine("INFO", `Link at ${pathTo} deleted successfully.`);

        else printLogLine("WARN", `Failed to delete link at ${pathTo} (status ${res.status}).`);

        return res.ok;

    } catch (_err) {

        printLogLine("ERROR", `Failed to delete link at ${pathTo}.`);

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}
