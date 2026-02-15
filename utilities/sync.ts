import { readInFirebaseRTDB } from "./read.ts";

import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export async function syncCounterWithDb(FIREBASE_URL: string): Promise<{ actualCount: number; success: boolean }> {

    const data = await readInFirebaseRTDB<Record<string, any>>(FIREBASE_URL, "urls", { shallow: true });
    
    const actualCount: number = data ? Object.keys(data).length : 0;

    const url: string = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/meta.json`;
    
    try {

        const res = await fetch(url, {

            method: "PATCH",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ "_url_counter": actualCount }) 

        });
        
        return { actualCount, success: res.ok };

    } catch {

        printLogLine("ERROR", "Unable to update the url counter in metadata.")

        return { actualCount, success: false };

    }

}