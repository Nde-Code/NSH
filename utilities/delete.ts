import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export async function deleteInFirebaseRTDB(FIREBASE_URL: string, pathToLink: string): Promise<boolean> {

    const url = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/${pathToLink}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const res = await fetch(url, {

            method: "DELETE",

            signal: controller.signal

        });

        if (res.ok) printLogLine("INFO", `The link stored on ${pathToLink} has been deleted successfully.`);
        
        else printLogLine("WARN", `Deletion returned status ${res.status} on ${pathToLink}.`);

        return res.ok;

    } catch (_err) {

        printLogLine("ERROR", `An error happened when deleting on ${pathToLink}.`);

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}
