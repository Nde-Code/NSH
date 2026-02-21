import { printLogLine } from "./utils.ts";

import { readInFirebaseRTDB } from "./read.ts";

export type VerificationStatus = "already_verified" | "verified_now" | "not_found" | "error";

type FirebaseData = { is_verified?: boolean };

export async function setIsVerifiedTrue(baseURLWithSecret: string, timeoutValue: number, pathTo: string): Promise<VerificationStatus> {

    const { data: currentData, error } = await readInFirebaseRTDB<FirebaseData>(baseURLWithSecret, timeoutValue, pathTo);

    if (error) return "error";

    if (!currentData) return "not_found";

    if (currentData.is_verified === true) return "already_verified";

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const patchRes = await fetch(url, {

            method: "PATCH",

            headers: { "Content-Type": "application/json" },

            body: JSON.stringify({ is_verified: true }),

            signal: controller.signal

        });

        if (patchRes.ok) {

            printLogLine("INFO", `The link stored on ${pathTo} has been verified successfully.`);

            return "verified_now";

        }

        return "error";

    } catch {

        return "error";

    } finally {

        clearTimeout(timeoutId);

    }
    
}