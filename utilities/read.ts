import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export async function readInFirebaseRTDB<T>(FIREBASE_URL: string, ID?: string): Promise<T | null> {

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const url: string = `${FIREBASE_URL}${(ID === undefined) ? config.FIREBASE_HIDDEN_PATH : (config.FIREBASE_HIDDEN_PATH + '/' + ID)}.json`;

        const res: Response = await fetch(url, {

            method: "GET",

            headers: {

                "Content-Type": "application/json",

            },

            signal: controller.signal

        });

        clearTimeout(timeoutId);

        if (!res.ok) return null;

        const data: T = await res.json();
        
        return data;

    } catch (_err) {

        clearTimeout(timeoutId);

        printLogLine("ERROR", `An error happened when reading ${(ID === undefined) ? "URLs" : `the link(${ID})`}.`);

        return null;

    }

}
