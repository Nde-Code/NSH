import { printLogLine } from "./utils.ts";

export async function deleteInFirebaseRTDB(baseURLWithSecret: string, timeoutValue: number, pathTo: string): Promise<boolean> {

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

    try {

        const res = await fetch(url, {

            method: "DELETE",

            signal: controller.signal

        });

        if (res.ok) printLogLine("INFO", `The link stored on ${pathTo} has been deleted successfully.`);
        
        else printLogLine("WARN", `Deletion returned status ${res.status} on ${pathTo}.`);

        return res.ok;

    } catch (_err) {

        printLogLine("ERROR", `An error happened when deleting on ${pathTo}.`);

        return false;

    } finally {

        clearTimeout(timeoutId);

    }

}
