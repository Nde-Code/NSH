import { putInFirebaseRTDB } from "./utilities/write.ts";

import { readInFirebaseRTDB } from "./utilities/read.ts";

import { deleteInFirebaseRTDB } from "./utilities/delete.ts";

import { setIsVerifiedTrue, VerificationStatus } from "./utilities/verify.ts";

import { Env, Config, LinkDetails, UrlPostBody, UrlDatabaseMap } from "./types/types.ts";

import {
	
	isConfigValidWithMinValues,
	
	extractValidID,
	
	getApiKeyFromRequest,
	
	isValidUrl,
	
	normalizeURL,
	
	sha256,
	
	parseJsonBody,
	
	printLogLine

} from "./utilities/utils.ts";

import { checkTimeRateLimit, checkDailyRateLimit, hashIp } from "./utilities/rate.ts";

import { createJsonResponse } from "./utilities/create_json.ts";

import { config } from "./config.ts";

import { buildLocalizedMessage, translateKey } from "./utilities/translations.ts";

async function handler(req: Request, env: Env): Promise<Response> {

	config.FIREBASE_URL = env.FIREBASE_HOST_LINK ?? "";

    config.FIREBASE_HIDDEN_PATH = env.FIREBASE_HIDDEN_PATH ?? "";

    config.ADMIN_KEY = env.ADMIN_KEY ?? "";

    config.HASH_KEY = env.HASH_KEY ?? "";

	const url: URL = new URL(req.url);

	const pathname: string = url.pathname;

	const ip: string = req.headers.get("cf-connecting-ip") ?? "unknown";

	const hashedIP: string = await hashIp(ip);

	const configMinValues: Partial<Record<keyof Config, number>> = {

		RATE_LIMIT_INTERVAL_S: 1,

		MAX_DAILY_WRITES: 1,

		IPS_PURGE_TIME_DAYS: 1,

		FIREBASE_TIMEOUT_MS: 1000,

		FIREBASE_ENTRIES_LIMIT: 50,

		SHORT_URL_ID_LENGTH: 10,

		MAX_URL_LENGTH: 100

	}

	if (!config.FIREBASE_URL || !config.FIREBASE_HIDDEN_PATH || !config.HASH_KEY || !config.ADMIN_KEY) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'MISSING_CREDENTIALS'), 500);
	
	if (!isConfigValidWithMinValues(config, configMinValues)) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_CONFIG'), 500);

	if (!hashedIP || hashedIP.length !== 64) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_HASH'), 403);

	if (req.method === "OPTIONS") {

		return new Response(null, {

			status: 204,

			headers: {

				"Access-Control-Allow-Origin": "*",

				"Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",

				"Access-Control-Allow-Headers": "Content-Type",

				"Access-Control-Max-Age": "86400"

			}

		});
		
	}

	if (req.method === "GET" && pathname === "/urls") {

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for listing URL(s) !")
			
			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_URLS_DB'), 401);
		
		}

		else {

			const data: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL);
	
			if (!data) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'NO_URLS_IN_DB'), 200);
	
			else return createJsonResponse(data, 200);

		}

	}

	if (req.method === "PATCH" && pathname.startsWith("/verify/")) {

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_ID'), 400);

		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for link verification !");
			
			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_VERIFICATION'), 401);
		
		}

		const result: VerificationStatus = await setIsVerifiedTrue(config.FIREBASE_URL, ID);

		if (result === "verified_now") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'LINK_VERIFIED'), 200);	

		else if (result === "already_verified") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'LINK_ALREADY_VERIFIED'), 200);

		else if (result === "not_found") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);

	}

	if (req.method === "DELETE" && pathname.startsWith("/delete/")) {

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_ID'), 400);
		
		const apiKey: string | null = getApiKeyFromRequest(req);

		if (apiKey !== config.ADMIN_KEY) {

			printLogLine("WARN", "Invalid API or Admin key provided for deletion !");
			
			return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'WRONG_API_KEY_FOR_DELETION'), 401);
		
		}

		else {

			const data: boolean  = await deleteInFirebaseRTDB(config.FIREBASE_URL, ID);

			if (data === true) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'LINK_DELETED'), 200)
			
			else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_LINK_FOUND_WITH_ID_IN_DB'), 404);

		}
	
	}

	if (req.method === "GET" && pathname.startsWith("/url/")) {

		const ID: string | boolean = extractValidID(pathname);

		if (ID === false) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NO_ID'), 400);

		const data: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL, ID);

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

		if (!(await checkTimeRateLimit(hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'RATE_LIMIT_EXCEEDED'), 429);

		const data: UrlPostBody | null = await parseJsonBody<UrlPostBody>(req);

		if (!data || typeof data.long_url !== "string" || !data.long_url.trim()) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'INVALID_POST_BODY'), 400);

		const keys = Object.keys(data as object);

		if (keys.length !== 1 || keys[0] !== "long_url") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'UNEXPECTED_FIELD_IN_BODY'), 400);

		const normalizedURL: string | null = normalizeURL(data.long_url);

		if (!normalizedURL) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'MISSING_LONG_URL_FIELD'), 400);

		if (!isValidUrl(normalizedURL)) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'NOT_A_VALID_URL'), 400);

		if (normalizedURL.length > config.MAX_URL_LENGTH) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'TOO_LONG_URL'), 400);

		const urlKey: string = (await sha256(normalizedURL)).slice(0, config.SHORT_URL_ID_LENGTH);

		const existing: LinkDetails | null = await readInFirebaseRTDB<LinkDetails>(config.FIREBASE_URL, urlKey);

		if (existing) {

			if (existing.long_url === normalizedURL) return createJsonResponse({ [translateKey(config.LANG_CODE, 'success')]: `${url.origin}/url/${urlKey}` }, 200);
				
			else return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'HASH_COLLISION'), 500);
			
		}
		
		const completeDB: UrlDatabaseMap | null = await readInFirebaseRTDB<UrlDatabaseMap>(config.FIREBASE_URL);
		
		if (completeDB && Object.keys(completeDB).length > config.FIREBASE_ENTRIES_LIMIT) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'DB_LIMIT_REACHED'), 507);
		
		if (!(await checkDailyRateLimit(env.RATE_LIMIT_KV, hashedIP))) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'WRITE_LIMIT_EXCEEDED'), 429);

		const firebaseData: LinkDetails = {

			long_url: normalizedURL,

			post_date: new Date().toISOString(),

			is_verified: false

		};

		const result: LinkDetails | null = await putInFirebaseRTDB<LinkDetails, LinkDetails>(config.FIREBASE_URL, urlKey, firebaseData);

		const firebaseResponse: string | null = (result !== null && result.long_url === firebaseData.long_url && result.post_date === firebaseData.post_date && result.is_verified === firebaseData.is_verified) ? `${url.origin}/url/${urlKey}` : null;

		if (firebaseResponse === null) return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'error', 'LINK_NOT_GENERATED'), 500);

		else return createJsonResponse({ [translateKey(config.LANG_CODE, 'success')]: firebaseResponse }, 201);

	}

	if (req.method === "GET" && pathname === "/") return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'success', 'ROOT_URL_MESSAGE'), 200)

	return createJsonResponse(buildLocalizedMessage(config.LANG_CODE, 'warning', 'INVALID_API_ENDPOINT'), 404);

}

export default {

	async fetch(req: Request, env: Env): Promise<Response> {

		return handler(req, env);

	}

};