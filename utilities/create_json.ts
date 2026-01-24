export function createJsonResponse(body: object, status: number = 200, headers: HeadersInit = {}): Response {

    return new Response(JSON.stringify(body), {

        status,

        headers: {

            "Content-Type": "application/json",

            "Access-Control-Allow-Origin": "*",

            ...headers,

        },

    });

}
