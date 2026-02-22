export const MSG = {

    MISSING_CREDENTIALS: { error: "Your credentials are missing." },

    WRONG_CONFIG: { error: "Invalid configuration. Check config.ts." },

    RATE_LIMIT_EXCEEDED: (s: number) => ({ warning: `Rate limit exceeded: 1 request per ${s}s allowed.` }),

    WRONG_API_KEY_FOR_SYNC: { error: "Incorrect or missing API key for counter synchronization." },

    SYNC_OK: { success: "Counter synchronized successfully." },

    WRONG_API_KEY_FOR_URLS_DB: { error: "Incorrect or missing API key for URLs." },

    NOT_VALID_COUNT_PARAMETER: (max: number) => ({ error: `Count must be 1-${max}.` }),

    NOT_VALID_CURSOR_PARAMETER: { error: "Invalid cursor." },

    NO_URLS_IN_DB: { warning: "No URLs are available." },

    NO_ID: { error: "No valid ID provided." },

    WRONG_API_KEY_FOR_VERIFICATION: { error: "Invalid or missing API key for verification." },

    LINK_VERIFIED: { success: "Link verified successfully." },

    LINK_ALREADY_VERIFIED: { warning: "Link already verified." },

    NO_LINK_FOUND_WITH_ID_IN_DB: { error: "Link unavailable or not found." },

    WRONG_API_KEY_FOR_DELETION: { error: "Invalid or missing API key for deletion." },

    LINK_DELETED: { success: "Link deleted." },

    INVALID_POST_BODY: { error: "Invalid POST body." },

    UNEXPECTED_FIELD_IN_BODY: { error: "The body contains an unexpected field." },

    NOT_A_VALID_URL: { error: "Not a valid URL." },

    TOO_LONG_URL: (max: number) => ({ error: `URL too long (max ${max}).` }),

    HASH_COLLISION: { error: "Hash collision detected..." },

    DB_LIMIT_REACHED: { warning: "Database limit reached." },

    WRITE_LIMIT_EXCEEDED: (max: number) => ({ warning: `Daily limit reached (${max} writes).` }),

    SERVICE_TEMP_UNAVAILABLE: { warning: "Service unavailable." },

    LINK_NOT_GENERATED: { error: "Link could not be generated." },

    ROOT_URL_MESSAGE: { success: "Welcome on the API root. Docs: https://github.com/Nde-Code/NSH" },

    INVALID_API_ENDPOINT: { warning: "Invalid endpoint." },
    
} as const;