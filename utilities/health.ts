import { MSG } from "./messages.ts";

import { readInFirebaseRTDB } from "./read.ts";

import { createJsonResponse } from "./utils.ts";

import { Env, RuntimeConfig, HealthCheckResult } from "../types/types.ts";

export async function handleHealthCheck(env: Env, config: RuntimeConfig): Promise<Response> {
    
    const timestamp: string = new Date().toISOString();

    const checks = {

        config_valid: false,

        firebase_reachable: false,

        counter_accessible: false,

        kv_store_available: false

    };

    const configValid: boolean = !!config.FIREBASE_URL && !!config.FIREBASE_HIDDEN_PATH && !!config.HASH_KEY && !!config.ADMIN_KEY && !!config.MONITORING_KEY;
    
    checks.config_valid = configValid;

    if (!configValid) return createJsonResponse({ status: "unhealthy", timestamp, checks, message: MSG.WRONG_CONFIG.error }, 503);

    const secretDbBase: string = config.FIREBASE_URL + config.FIREBASE_HIDDEN_PATH;

    const { data: counterValue, error: fbError } = await readInFirebaseRTDB<number>(secretDbBase, config.FIREBASE_TIMEOUT_MS, "meta/_url_counter");

    checks.firebase_reachable = !fbError;

    checks.counter_accessible = !fbError && typeof counterValue === "number";

    let kvAvailable: boolean = false;

    try {

        const testKey: string = `health_check_${crypto.randomUUID()}`;

        const testValue: string = timestamp;

        await env.RATE_LIMIT_KV.put(testKey, testValue, { expirationTtl: 60 });

        const retrieved: string | null = await env.RATE_LIMIT_KV.get(testKey);

        kvAvailable = retrieved === testValue;

    } catch (_err) {

        kvAvailable = false;

    }
    
    checks.kv_store_available = kvAvailable;

    const hasAvailableLinkCapacity: boolean = typeof counterValue === "number" && counterValue < config.MAX_NUMBER_OF_LINKS_COUNT; 

    const allHealthy: boolean = checks.config_valid && checks.firebase_reachable && checks.counter_accessible && hasAvailableLinkCapacity && checks.kv_store_available;

    const degraded: boolean = checks.config_valid && (!checks.kv_store_available || !checks.counter_accessible || !hasAvailableLinkCapacity);

    const status: "healthy" | "degraded" | "unhealthy" = (allHealthy === true) ? "healthy" : (degraded === true) ? "degraded" : "unhealthy";

    const statusCode: 200 | 206 | 503 = (status === "healthy") ? 200 : (status === "degraded") ? 206 : 503;

    const result: HealthCheckResult = {

        status,

        timestamp,

        checks,

        message: (allHealthy === true) ? MSG.SYSTEM_OK.success : (degraded === true) ? MSG.SYSTEM_DEGRADATION.warning : MSG.SYSTEM_DOWN.error
    
    };

    return createJsonResponse(result, statusCode);

}