import { supportedLang } from "../utilities/translations.ts";

export interface Env {

    FIREBASE_HOST_LINK: string;

    FIREBASE_HIDDEN_PATH: string;

    ADMIN_KEY: string;

    HASH_KEY: string;

    RATE_LIMIT_KV: KVNamespace;
    
}

export interface Config {

    FIREBASE_URL: string;

    FIREBASE_HIDDEN_PATH: string;

    HASH_KEY: string;

    ADMIN_KEY: string;

    LANG_CODE: supportedLang;
    
    RATE_LIMIT_INTERVAL_S: number;

    MAX_DAILY_WRITES: number;

    IPS_PURGE_TIME_DAYS: number;

    FIREBASE_TIMEOUT_MS: number;

    FIREBASE_ENTRIES_LIMIT: number;

    SHORT_URL_ID_LENGTH: number;

    MAX_URL_LENGTH: number;

}

export interface LinkDetails {

	long_url: string

	post_date: string

    is_verified: boolean

}

export type UrlPostBody = { long_url: string };

export type UrlDatabaseMap = Record<string, { long_url: string; post_date: string, is_verified: boolean }>;