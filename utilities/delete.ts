import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export async function deleteInFirebaseRTDB(FIREBASE_URL: string, ID: string): Promise<boolean> {

    const url = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/${ID}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const res = await fetch(url, {

            method: "DELETE",

            signal: controller.signal

        });

        printLogLine("INFO", `The link(${ID}) has been deleted successfully.`);

        return res.ok;

    } catch (_err) {

        printLogLine("ERROR", `An error heppened when deleting the link(${ID}).`);

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}
