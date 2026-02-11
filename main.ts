import { putInFirebaseRTDB } from "./utilities/write.ts";

import { updateFirebaseCounter } from "./utilities/counter.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { deleteInFirebaseRTDB } from "./utilities/delete.ts";

import { setIsVerifiedTrue, VerificationStatus } from "./utilities/verify.ts";

import {
	
	Env,
	
	Config,
	
	LinkDetails,
	
	UrlPostBody

} from "./types/types.ts";

import {

	createJsonResponse,
	
	isConfigValidWithMinValues,
	
	extractValidID,
	
	getApiKeyFromRequest,

	normalizeAndValidateURL,
	
	simpleURLHash,
	
	parseJsonBody,
	
	printLogLine

} from "./utilities/utils.ts";

import {
	
	RateLimitResult,
	
	checkTimeRateLimit,
	
	checkDailyRateLimit,
	
	hashIp

} from "./utilities/rate.ts";

import { config } from "./config.ts";

import { MSG } from "./utilities/messages.ts";

const configMinValues: Partial<Record<keyof Config, number>> = {

	RATE_LIMIT_INTERVAL_S: 1,

	MAX_DAILY_WRITES: 1,

	IPS_PURGE_TIME_DAYS: 1,

	FIREBASE_TIMEOUT_MS: 1000,

	FIREBASE_ENTRIES_LIMIT: 50,

	DEFAULT_NUMBER_OF_LINKS_FROM_COUNT: 5,

    MAX_NUMBER_OF_LINKS_COUNT: 10,

	SHORT_URL_ID_LENGTH: 10,

	MAX_URL_LENGTH: 100

}

let lastEnv: Env | null = null;

let configChecked: boolean = false;

function initConfig(env: Env) {

	if (lastEnv === env) return;

	config.FIREBASE_URL = env.FIREBASE_HOST_LINK ?? "";

	config.FIREBASE_HIDDEN_PATH = env.FIREBASE_HIDDEN_PATH ?? "";

	config.ADMIN_KEY = env.ADMIN_KEY ?? "";

	config.HASH_KEY = env.HASH_KEY ?? "";

	lastEnv = env;

}

function checkConfigOnce(): boolean {

    if (configChecked) return true;

    configChecked = isConfigValidWithMinValues(config, configMinValues) && config.FIREBASE_ENTRIES_LIMIT >= config.MAX_NUMBER_OF_LINKS_COUNT && config.FIREBASE_ENTRIES_LIMIT >= config.DEFAULT_NUMBER_OF_LINKS_FROM_COUNT && config.DEFAULT_NUMBER_OF_LINKS_FROM_COUNT <= config.MAX_NUMBER_OF_LINKS_COUNT;
    
	return configChecked;

}

async function handler(req: Request, env: Env): Promise<Response> {

	initConfig(env);

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	if (pathname === "/favicon.ico") return new Response(null, { status: 204 });

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH || !config.HASH_KEY || !config.ADMIN_KEY) return createJsonResponse(MSG.MISSING_CREDENTIALS, 500);
	
	if (!checkConfigOnce()) return createJsonResponse(MSG.WRONG_CONFIG, 500);
	
	if (req.method === "OPTIONS") {

		return new Response(null, {

			status: 204,

			headers: {

				"Access-Control-Allow-Origin": "*",

				"Access-Control-Allow-Methods": "POST, OPTIONS",

				"Access-Control-Allow-Headers": "Content-Type",

				"Access-Control-Max-Age": "86400"

			}

		});
		
	}

	if (req.method === "GET" && pathname === "/urls") {

		const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(MSG.RATE_LIMIT_EXCEEDED(config.RATE_LIMIT_INTERVAL_S), 429);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for listing URL(s) !");

			return createJsonResponse(MSG.WRONG_API_KEY_FOR_URLS_DB, 401);

		}

		const countParam: string | null = url.searchParams.get("count");

		const cursor: string | null = url.searchParams.get("cursor");

		if (cursor) {

			const cursorExists = await readInFirebaseRTDB(config.FIREBASE_URL, `urls/${cursor}`);

			if (!cursorExists) return createJsonResponse(MSG.NOT_VALID_CURSOR_PARAMETER, 400);

		}

		const requestedCount: number = countParam ? parseInt(countParam) : config.DEFAULT_NUMBER_OF_LINKS_FROM_COUNT;

		if (isNaN(requestedCount) || requestedCount <= 0 || requestedCount > config.MAX_NUMBER_OF_LINKS_COUNT) return createJsonResponse(MSG.NOT_VALID_COUNT_PARAMETER(config.MAX_NUMBER_OF_LINKS_COUNT), 400);

		const data: Record<string, LinkDetails> | null = await readInFirebaseRTDB<Record<string, LinkDetails>>(

			config.FIREBASE_URL,

			"urls", {

				orderBy: "$key",

				limitToFirst: (requestedCount + 1),

				...(cursor ? { startAfter: cursor } : {})

			}

		);

		if (!data || Object.keys(data).length === 0) return createJsonResponse(MSG.NO_URLS_IN_DB, 200);

		const keys: string[] = Object.keys(data);

		const hasMore: boolean = keys.length > requestedCount;

		if (hasMore) {

			delete data[keys[keys.length - 1]];

			keys.pop();
			
		}

		const nextCursor = hasMore ? keys[keys.length - 1] : null;

		printLogLine("INFO", `Returned ${keys.length} link${(keys.length === 1) ? "" : "s"} from /urls.`);

		return createJsonResponse({

			urls: data,

			next_cursor: nextCursor,

			has_more: hasMore

		}, 200);

	}

	if (req.method === "PATCH" && pathname.startsWith("/verify/")) {

		const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(MSG.RATE_LIMIT_EXCEEDED(config.RATE_LIMIT_INTERVAL_S), 429);

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(MSG.NO_ID, 400);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for link verification !");
			
			return createJsonResponse(MSG.WRONG_API_KEY_FOR_VERIFICATION, 401);
		
		}

		const result: VerificationStatus = await setIsVerifiedTrue(config.FIREBASE_URL, "urls/" + ID);

		if (result === "verified_now") return createJsonResponse(MSG.LINK_VERIFIED, 200);	

		else if (result === "already_verified") return createJsonResponse(MSG.LINK_ALREADY_VERIFIED, 200);

		else if (result === "not_found") return createJsonResponse(MSG.NO_LINK_FOUND_WITH_ID_IN_DB, 404);

		else return createJsonResponse(MSG.SERVICE_TEMP_UNAVAILABLE, 503);

	}

	if (req.method === "DELETE" && pathname.startsWith("/delete/")) {

		const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(MSG.RATE_LIMIT_EXCEEDED(config.RATE_LIMIT_INTERVAL_S), 429);

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(MSG.NO_ID, 400);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for deletion!");

			return createJsonResponse(MSG.WRONG_API_KEY_FOR_DELETION, 401);

		}

		const existing = await readInFirebaseRTDB(config.FIREBASE_URL, "urls/" + ID);

		if (!existing) return createJsonResponse(MSG.NO_LINK_FOUND_WITH_ID_IN_DB, 404);

		const isDeleted: boolean = await deleteInFirebaseRTDB(config.FIREBASE_URL, "urls/" + ID);

		if (isDeleted) {

			await updateFirebaseCounter(config.FIREBASE_URL, "meta", -1);

			return createJsonResponse(MSG.LINK_DELETED, 200);

		}
		
		else return createJsonResponse(MSG.SERVICE_TEMP_UNAVAILABLE, 500);

	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(MSG.NO_ID, 400);

		const data: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL, "urls/" + ID);

		if (data && data !== null) {

			return new Response(null, {

				status: (data.is_verified === true) ? 301 : 302,

				headers: {

					Location: data.long_url.toString()

				},

			});

		}
		
		else return createJsonResponse(MSG.NO_LINK_FOUND_WITH_ID_IN_DB, 404);
	
	}

  	if (req.method === "POST" && pathname === "/post-url") {

        const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

        if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(MSG.RATE_LIMIT_EXCEEDED(config.RATE_LIMIT_INTERVAL_S), 429);

        const data: UrlPostBody | null = await parseJsonBody<UrlPostBody>(req);

        if (!data || typeof data.long_url !== "string" || !data.long_url.trim()) return createJsonResponse(MSG.INVALID_POST_BODY, 400);
        
        if (!("long_url" in data) || Object.getOwnPropertyNames(data).length !== 1) return createJsonResponse(MSG.UNEXPECTED_FIELD_IN_BODY, 400);
        
        const normalizedURL: string | null = normalizeAndValidateURL(data.long_url);

        if (!normalizedURL || normalizedURL.includes(`://${url.host}`)) return createJsonResponse(MSG.NOT_A_VALID_URL, 400);
        
        if (normalizedURL.length > config.MAX_URL_LENGTH) return createJsonResponse(MSG.TOO_LONG_URL(config.MAX_URL_LENGTH), 400);

        const urlKey: string = simpleURLHash(normalizedURL, config.SHORT_URL_ID_LENGTH);
        
		const existing: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL, "urls/" + urlKey);
        
        if (existing) {

            if (existing.long_url === normalizedURL) return createJsonResponse({ success: `${url.origin}/url/${urlKey}` }, 200);
			
			else return createJsonResponse(MSG.HASH_COLLISION, 500);

        }

        const rateResult: RateLimitResult = await checkDailyRateLimit(env.RATE_LIMIT_KV, hashedIP);
        
		if (rateResult === "USER_LIMIT") return createJsonResponse(MSG.WRITE_LIMIT_EXCEEDED(config.MAX_DAILY_WRITES), 429);
        
		if (rateResult === "KV_QUOTA_EXCEEDED") return createJsonResponse(MSG.SERVICE_TEMP_UNAVAILABLE, 503);

        let countValue: number | null = await readInFirebaseRTDB<number>(config.FIREBASE_URL, "meta/_url_counter");

        if (countValue === null) {

            printLogLine("INFO", "Counter not found, initializing to 0...");

            await updateFirebaseCounter(config.FIREBASE_URL, "meta", 0);

            countValue = 0;

        }

        if (countValue >= config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse(MSG.DB_LIMIT_REACHED, 507);

        const firebaseData: LinkDetails = {

            long_url: normalizedURL,

            post_date: new Date().toISOString(),

            is_verified: false

        };

        const result = await putInFirebaseRTDB<LinkDetails, LinkDetails>(config.FIREBASE_URL, "urls/" + urlKey, firebaseData);
        
        if (!result) return createJsonResponse(MSG.LINK_NOT_GENERATED, 500);

        await updateFirebaseCounter(config.FIREBASE_URL, "meta", 1);

        return createJsonResponse({ success: `${url.origin}/url/${urlKey}` }, 201);

    }

	if (req.method === "GET" && pathname === "/") return createJsonResponse(MSG.ROOT_URL_MESSAGE, 200)

	return createJsonResponse(MSG.INVALID_API_ENDPOINT, 404);

}

export default {

	async fetch(req: Request, env: Env): Promise<Response> {

		return handler(req, env);

	}

};