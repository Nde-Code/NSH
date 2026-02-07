import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export async function putInFirebaseRTDB<T = unknown, U = unknown>(FIREBASE_URL: string, pathToLink: string, data: U): Promise<T | null> {

    const url: string = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/${pathToLink}.json`;

    const controller: AbortController = new AbortController();

    const timeoutId: number = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const res: Response = await fetch(url, {

            method: "PUT",

            headers: {

                "Content-Type": "application/json",

            },

            body: JSON.stringify(data),

            signal: controller.signal

        });

        clearTimeout(timeoutId);

        if (!res.ok) return null;

        if (pathToLink !== "meta/_url_counter") printLogLine("INFO", `Successfully posted new link on ${pathToLink}.`);

        return (await res.json()) as T;

    } catch(_err) {

        clearTimeout(timeoutId);

        printLogLine("ERROR", `An error happened when writing on ${pathToLink}.`);

        return null;

    }

}