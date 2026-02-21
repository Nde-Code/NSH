export async function updateFirebaseCounter(baseURLWithSecret: string, timeoutValue: number, pathTo: string, step: number): Promise<boolean> {

    const url: string = `${baseURLWithSecret}/${pathTo}.json`;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => controller.abort(), timeoutValue);

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