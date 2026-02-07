import { Config } from "./types/types.ts";

export const config: Config = {

    FIREBASE_URL: "",

    FIREBASE_HIDDEN_PATH: "",

    HASH_KEY: "",

    ADMIN_KEY: "",
    
    RATE_LIMIT_INTERVAL_S: 1,

    MAX_DAILY_WRITES: 10,

    IPS_PURGE_TIME_DAYS: 1,

    FIREBASE_TIMEOUT_MS: 6000,

    FIREBASE_ENTRIES_LIMIT: 1000,

    DEFAULT_NUMBER_OF_LINKS_FROM_COUNT: 15,

    MAX_NUMBER_OF_LINKS_COUNT: 1000,

    SHORT_URL_ID_LENGTH: 14,

    MAX_URL_LENGTH: 2000

};