import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export async function deleteInFirebaseRTDB(FIREBASE_URL: string, pathTo: string): Promise<boolean> {

    const url: string = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const res = await fetch(url, {

            method: "DELETE",

            signal: controller.signal

        });

        if (res.ok) printLogLine("INFO", `The link stored on ${pathTo} has been deleted successfully.`);
        
        else printLogLine("WARN", `Deletion returned status ${res.status} on ${pathTo}.`);

        return res.ok;

    } catch (_err) {

        printLogLine("ERROR", `An error happened when deleting on ${pathTo}.`);

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}
