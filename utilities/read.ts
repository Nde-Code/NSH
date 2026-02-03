import { config } from "../config.ts";

import { printLogLine } from "./utils.ts";

interface FirebaseQueryOptions {

    orderBy?: string;    

    limitToFirst?: number; 
    
    limitToLast?: number;  
    
    startAt?: string | number;

    startAfter?: string | number;

    endAt?: string | number;

    endBefore?: string | number;

}

export async function readInFirebaseRTDB<T>(FIREBASE_URL: string, pathToID?: string, options?: FirebaseQueryOptions): Promise<T | null> {

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), config.FIREBASE_TIMEOUT_MS);

    try {

        let url: string = `${FIREBASE_URL}${(pathToID === undefined) ? config.FIREBASE_HIDDEN_PATH : (config.FIREBASE_HIDDEN_PATH + '/' + pathToID)}.json`;

        if (options) {

            const params: URLSearchParams = new URLSearchParams();

            if (options.orderBy) params.append("orderBy", JSON.stringify(options.orderBy));

            if (options.limitToFirst) params.append("limitToFirst", options.limitToFirst.toString());

            if (options.limitToLast) params.append("limitToLast", options.limitToLast.toString());

            if (options.startAt !== undefined) params.append("startAt", JSON.stringify(options.startAt));

            if (options.startAfter !== undefined) params.append("startAfter", JSON.stringify(options.startAfter));

            if (options.endAt !== undefined) params.append("endAt", JSON.stringify(options.endAt));

            if (options.endBefore !== undefined) params.append("endBefore", JSON.stringify(options.endBefore));

            url += `?${params.toString()}`;
            
        }

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

        printLogLine("ERROR", `An error happened when reading ${(pathToID === undefined) ? ": URLs" : `on: ${pathToID}`}.`);

        return null;

    }

}
