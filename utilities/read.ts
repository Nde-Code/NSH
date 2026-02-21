import { printLogLine } from "./utils.ts";

interface FirebaseQueryOptions {

    orderBy?: string;  

    limitToFirst?: number; 

    limitToLast?: number; 

    startAt?: string | number;

    startAfter?: string | number;

    endAt?: string | number;

    endBefore?: string | number;

    shallow?: boolean;

}

export type ReadResult<T> = {

    data: T | null;

    error: boolean;

};

export async function readInFirebaseRTDB<T>(baseURLWithSecret: string, timeoutValue: number, pathTo?: string, options?: FirebaseQueryOptions): Promise<ReadResult<T>> { 
    
    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        let url: string = `${baseURLWithSecret}${pathTo ? '/' + pathTo : ''}.json`;
        
        if (options) {

            const params: URLSearchParams = new URLSearchParams();

            if (options.orderBy) params.append("orderBy", JSON.stringify(options.orderBy));

            if (options.limitToFirst) params.append("limitToFirst", options.limitToFirst.toString());

            if (options.limitToLast) params.append("limitToLast", options.limitToLast.toString());

            if (options.startAt !== undefined) params.append("startAt", JSON.stringify(options.startAt));

            if (options.startAfter !== undefined) params.append("startAfter", JSON.stringify(options.startAfter));

            if (options.endAt !== undefined) params.append("endAt", JSON.stringify(options.endAt));

            if (options.endBefore !== undefined) params.append("endBefore", JSON.stringify(options.endBefore));

            if (options.shallow !== undefined) params.append("shallow", "true");

            url += `?${params.toString()}`;

        }

        const res = await fetch(url, {

            method: "GET",

            headers: { "Content-Type": "application/json" },

            signal: controller.signal

        });

        if (!res.ok) {

            printLogLine("ERROR", `Firebase responded with status: ${res.status}`);

            return { data: null, error: true }; 

        }

        const data: T = await res.json();

        return { data, error: false };

    } catch (_err) {

        printLogLine("ERROR", `Fetch error on ${pathTo || 'root'}.`);

        return { data: null, error: true }; 
        
    } finally {

        clearTimeout(timeoutId);

    }
    
}