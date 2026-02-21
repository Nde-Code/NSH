export interface Env {

    FIREBASE_HOST_LINK: string;

    FIREBASE_HIDDEN_PATH: string;

    HASH_KEY: string;

    ADMIN_KEY: string;

    RATE_LIMIT_KV: KVNamespace;

}

export interface StaticConfig {

    RATE_LIMIT_INTERVAL_S: number;

    MAX_DAILY_WRITES: number;

    IPS_PURGE_TIME_DAYS: number;

    FIREBASE_TIMEOUT_MS: number;

    FIREBASE_ENTRIES_LIMIT: number;

    DEFAULT_NUMBER_OF_LINKS_FROM_COUNT: number;

    MAX_NUMBER_OF_LINKS_COUNT: number;

    SHORT_URL_ID_LENGTH: number;

    MAX_URL_LENGTH: number;

}

export interface RuntimeConfig extends StaticConfig {

    FIREBASE_URL: string;

    FIREBASE_HIDDEN_PATH: string;

    HASH_KEY: string;

    ADMIN_KEY: string;

}

export interface LinkDetails {

	long_url: string

	post_date: string

    is_verified: boolean

}

export type UrlPostBody = { long_url: string };