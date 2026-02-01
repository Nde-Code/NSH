import { putInFirebaseRTDB } from "./utilities/write.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { deleteInFirebaseRTDB } from "./utilities/delete.ts";

import { setIsVerifiedTrue, VerificationStatus } from "./utilities/verify.ts";

import { Env, Config, LinkDetails, UrlPostBody } from "./types/types.ts";

import {

	createJsonResponse,
	
	isConfigValidWithMinValues,
	
	extractValidID,
	
	getApiKeyFromRequest,
	
	isValidUrl,
	
	normalizeURL,
	
	simpleURLHash,
	
	parseJsonBody,
	
	printLogLine

} from "./utilities/utils.ts";

import { RateLimitResult, checkTimeRateLimit, checkDailyRateLimit, hashIp } from "./utilities/rate.ts";

import { config } from "./config.ts";

import { buildLocalizedMessage, translateKey } from "./utilities/translations.ts";

let lastEnv: Env | null = null;

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

function initConfig(env: Env) {

	if (lastEnv === env) return;

	config.FIREBASE_URL = env.FIREBASE_HOST_LINK ?? "";

	config.FIREBASE_HIDDEN_PATH = env.FIREBASE_HIDDEN_PATH ?? "";

	config.ADMIN_KEY = env.ADMIN_KEY ?? "";

	config.HASH_KEY = env.HASH_KEY ?? "";

	lastEnv = env;

}

async function handler(req: Request, env: Env): Promise<Response> {

	initConfig(env);

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	if (pathname === "/favicon.ico") return new Response(null, { status: 204 });

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH || !config.HASH_KEY || !config.ADMIN_KEY) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'MISSING_CREDENTIALS'), 500);
	
	if (!isConfigValidWithMinValues(config, configMinValues) || config.FIREBASE_ENTRIES_LIMIT < config.MAX_NUMBER_OF_LINKS_COUNT || config.FIREBASE_ENTRIES_LIMIT < config.DEFAULT_NUMBER_OF_LINKS_FROM_COUNT || config.DEFAULT_NUMBER_OF_LINKS_FROM_COUNT > config.MAX_NUMBER_OF_LINKS_COUNT) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_CONFIG'), 500);

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

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for listing URL(s) !");

			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_URLS_DB'), 401);

		}

		const countParam: string | null = url.searchParams.get("count");

		let requestedCount: number = countParam ? parseInt(countParam) : config.DEFAULT_NUMBER_OF_LINKS_FROM_COUNT;

		if (isNaN(requestedCount) || requestedCount <= 0 || requestedCount > config.MAX_NUMBER_OF_LINKS_COUNT) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NOT_VALID_COUNT_PARAMETER'), 400);

		const data: Record<string, LinkDetails> | null = await readInFirebaseRTDB(config.FIREBASE_URL,

    		"urls", {

        		orderBy: "$key",

        		limitToFirst: requestedCount,

    		}

		);

		const filteredData: Record<string, LinkDetails> = {};

		let linkCounter: number = 0;

		if (data) {

			for (const key in data) {

				if (linkCounter >= requestedCount) break;

				filteredData[key] = data[key];

				linkCounter++;

			}

		}

		if (!data || linkCounter === 0) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'NO_URLS_IN_DB'), 200);

		printLogLine("INFO", `Returned ${linkCounter} link${linkCounter !== 1 ? "s" : ""} from /urls.`)

		return createJsonResponse(filteredData, 200);
		
	}

	if (req.method === "PATCH" && pathname.startsWith("/verify/")) {

		const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_ID'), 400);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for link verification !");
			
			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_VERIFICATION'), 401);
		
		}

		const result: VerificationStatus = await setIsVerifiedTrue(config.FIREBASE_URL, "urls/" + ID);

		if (result === "verified_now") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'LINK_VERIFIED'), 200);	

		else if (result === "already_verified") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'LINK_ALREADY_VERIFIED'), 200);

		else if (result === "not_found") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);

	}

	if (req.method === "DELETE" && pathname.startsWith("/delete/")) {

		const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_ID'), 400);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for deletion !");

			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_DELETION'), 401);

		}

		const data: boolean = await deleteInFirebaseRTDB(config.FIREBASE_URL, "urls/" + ID);

		if (data === true) {

			let countData: { url_count: number } | null = await readInFirebaseRTDB<{ url_count: number }>(config.FIREBASE_URL, "meta/_url_counter");
			
			let currentCount = countData?.url_count ?? 0;

			currentCount = Math.max(0, currentCount - 1); 
			
			await putInFirebaseRTDB(config.FIREBASE_URL, "meta/_url_counter", { url_count: currentCount });

			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'LINK_DELETED'), 200);

		}
		
		else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);
	
	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_ID'), 400);

		const data: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL, "urls/" + ID);

		if (data && data !== null) {

			return new Response(null, {

				status: (data.is_verified === true) ? 302 : 301,

				headers: {

					Location: data.long_url.toString()

				},

			});

		}
		
		else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);
	
	}

  	if (req.method === "POST" && pathname === "/post-url") {

		const hashedIP: string = await hashIp(req.headers.get("cf-connecting-ip") ?? "unknown");

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const data: UrlPostBody | null = await parseJsonBody<UrlPostBody>(req);

		if (!data || typeof data.long_url !== "string" || !data.long_url.trim()) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'INVALID_POST_BODY'), 400);

		const keys = Object.keys(data as object);

		if (keys.length !== 1 || keys[0] !== "long_url") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'UNEXPECTED_FIELD_IN_BODY'), 400);

		const normalizedURL: string | null = normalizeURL(data.long_url);

		if (!normalizedURL || !isValidUrl(normalizedURL)) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NOT_A_VALID_URL'), 400);
		
		if (normalizedURL.length > config.MAX_URL_LENGTH) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'TOO_LONG_URL'), 400);

		const urlKey: string = simpleURLHash(normalizedURL, config.SHORT_URL_ID_LENGTH);

		const existing: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL, "urls/" + urlKey);

		if (existing) {

			if (existing.long_url === normalizedURL) return createJsonResponse({ [translateKey(config.LANG_CODE, 'success')]: `${url.origin}/url/${urlKey}` }, 200);
			
			else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'HASH_COLLISION'), 500);
		
		}

		let countData: { url_count: number } | null = await readInFirebaseRTDB<{ url_count: number }>(config.FIREBASE_URL, "meta/_url_counter");

		if (!countData) {

			await putInFirebaseRTDB(config.FIREBASE_URL, "meta/_url_counter", { url_count: 0 });

			countData = { url_count: 0 };

		}

		const currentCount: number = countData.url_count;

		if (currentCount >= config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'DB_LIMIT_REACHED'), 507);

		const rateResult: RateLimitResult = await checkDailyRateLimit(env.RATE_LIMIT_KV, hashedIP);

		if (rateResult === "USER_LIMIT") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'WRITE_LIMIT_EXCEEDED'), 429);
		
		if (rateResult === "KV_QUOTA_EXCEEDED") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'SERVICE_TEMP_UNAVAILABLE'), 503);

		const firebaseData: LinkDetails = {

			long_url: normalizedURL,

			post_date: new Date().toISOString(),

			is_verified: false

		};

		const result: LinkDetails | null = await putInFirebaseRTDB<LinkDetails, LinkDetails>(config.FIREBASE_URL, "urls/" + urlKey, firebaseData);

		if (!result) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'LINK_NOT_GENERATED'), 500);

		await putInFirebaseRTDB(config.FIREBASE_URL, "meta/_url_counter", { url_count: currentCount + 1 });

		return createJsonResponse({ [translateKey(config.LANG_CODE, 'success')]: `${url.origin}/url/${urlKey}` }, 201);
	
	}

	if (req.method === "GET" && pathname === "/") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'ROOT_URL_MESSAGE'), 200)

	return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'INVALID_API_ENDPOINT'), 404);

}

export default {

	async fetch(req: Request, env: Env): Promise<Response> {

		return handler(req, env);

	}

};