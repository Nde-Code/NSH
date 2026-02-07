import { config } from "../config.js";

export async function updateFirebaseCounter(FIREBASE_URL: string, pathTo: string, step: number): Promise<boolean> {

    const url: string = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const res = await fetch(url, {

            method: "PATCH",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ "_url_counter": { ".sv": { "increment": step } } }),

            signal: controller.signal

        });

        return res.ok;

    } catch {

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}