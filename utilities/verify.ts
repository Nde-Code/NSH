import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

export type VerificationStatus = "already_verified" | "verified_now" | "not_found" | "error";

type FirebaseData = { is_verified?: boolean };

export async function setIsVerifiedTrue(FIREBASE_URL: string, ID: string): Promise<VerificationStatus> {

    const url: string = `${FIREBASE_URL}${config.FIREBASE_HIDDEN_PATH}/${ID}.json`;

    const controller: AbortController = new AbortController();
    
    const timeoutId: number = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        const getRes: Response = await fetch(url, { signal: controller.signal });

        if (!getRes.ok) {

            clearTimeout(timeoutId);

            return "not_found";

        }

        const currentData: FirebaseData = await getRes.json();

        if (!currentData) {

            clearTimeout(timeoutId);
            
            return "not_found";

        }

        if (currentData?.is_verified === true) {

            clearTimeout(timeoutId);

            return "already_verified";

        }

        const patchRes = await fetch(url, {

            method: "PATCH",

            headers: {
                
                "Content-Type": "application/json"
            
            },

            body: JSON.stringify({ is_verified: true }),

            signal: controller.signal

        });

        clearTimeout(timeoutId);

        printLogLine("INFO", `The link(${ID}) has been verified successfully.`);

        return patchRes.ok ? "verified_now" : "error";

    } catch (_err) {

        clearTimeout(timeoutId);

        printLogLine("ERROR", `An error heppened when verifying the link(${ID}).`);

        return "error";

    }

}
