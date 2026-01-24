import { config } from "../config.ts";

type TranslationStructure = typeof translations;

type MessageKey = keyof TranslationStructure["en"]["messages"];

type LabelKey = keyof TranslationStructure["en"]["labels"];

export type supportedLang = 'en' | 'fr';

export const translations = {

    en: {

        labels: {

            error: "error",

            warning: "warning",

            success: "success"

        },

        messages: {

            MISSING_CREDENTIALS: "Your credentials are missing.",

            WRONG_CONFIG: "Invalid configuration detected in your config.ts file. Please refer to the documentation.",

            WRONG_HASH: "Unable to hash your IP but it's required for security.",

            RATE_LIMIT_EXCEEDED: `Rate limit exceeded: only 1 request per ${config.RATE_LIMIT_INTERVAL_S}s allowed.`,

            WRONG_API_KEY_FOR_URLS_DB: "The API key provided for the db of URLs is incorrect or missing.",

            NO_URLS_IN_DB: "Sorry no URL(s) to retreive from the database.",

            NO_ID: "No (valid) ID was provided.",

            WRONG_API_KEY_FOR_VERIFICATION: "The API key provided for link verification is incorrect or missing.",

            LINK_VERIFIED: "The link has been verified successfully.",

            LINK_ALREADY_VERIFIED: "This link is already verified.",

            NO_LINK_FOUND_WITH_ID_IN_DB: "No record of this link was found in the database.",

            WRONG_API_KEY_FOR_DELETION: "The API key provided for link deletion is incorrect.",

            LINK_DELETED: "The link has been deleted correctly.",

            INVALID_POST_BODY: "The body of the POST request is not valid. Please refer to the documentation before sending the request.",

            MISSING_LONG_URL_FIELD: "The field 'long_url' is required but missing.",

            UNEXPECTED_FIELD_IN_BODY: "The body contains unexpected field.",

            NOT_A_VALID_URL: "The provided long_url is not in a valid URL format.",

            TOO_LONG_URL: `The URL is too long. Maximum allowed length is ${config.MAX_URL_LENGTH} characters.`,

            HASH_COLLISION: "Hash collision detected, please try again.",

            DB_LIMIT_REACHED: "The database has reached the limit of entries.",

           WRITE_LIMIT_EXCEEDED: `Rate limit exceeded: only ${config.MAX_DAILY_WRITES} write request${config.MAX_DAILY_WRITES > 1 ? 's' : ''} allowed per day.`,

            LINK_NOT_GENERATED: "Link could not be generated. Retry again later...",

            ROOT_URL_MESSAGE: "Welcome to the API root. For documentation and usage details, visit: https://github.com/Nde-Code/nsh.",

            INVALID_API_ENDPOINT: "The requested endpoint is invalid.",

        },

    },

    fr: {

        labels: {

            error: "erreur",

            warning: "avertissement",

            success: "succès"

        },

        messages: {

            MISSING_CREDENTIALS: "Vos identifiants sont manquants.",

            WRONG_CONFIG: "Une configuration invalide a été détectée dans votre fichier config.ts. Veuillez consulter la documentation.",
            
            WRONG_HASH: "Impossible de générer le hash de votre IP, ce qui est requis pour des raisons de sécurité.",
            
            RATE_LIMIT_EXCEEDED: `Limite de requêtes dépassée: une seule requête toutes les ${config.RATE_LIMIT_INTERVAL_S}s.`,
            
            WRONG_API_KEY_FOR_URLS_DB: "La clé API fournie pour obtenir la liste des URLs est incorrecte ou manquante.",

            NO_URLS_IN_DB: "Désolé, aucune URL à récupérer depuis la base de données.",

            NO_ID: "Aucun identifiant (valide) n'a été fourni.",
            
            WRONG_API_KEY_FOR_VERIFICATION: "La clé API fournie pour la vérification du lien est incorrecte ou manquante.",
            
            LINK_VERIFIED: "Le lien a été vérifié avec succès.",
            
            LINK_ALREADY_VERIFIED: "Ce lien a déjà été vérifié.",
            
            NO_LINK_FOUND_WITH_ID_IN_DB: "Aucun enregistrement de ce lien n'a été trouvé dans la base de données.",
            
            WRONG_API_KEY_FOR_DELETION: "La clé API fournie pour la suppression du lien est incorrecte.",
            
            LINK_DELETED: "Le lien a été supprimé avec succès.",
            
            INVALID_POST_BODY: "Le corps de la requête POST est invalide. Veuillez consulter la documentation avant d'envoyer la requête.",
            
            MISSING_LONG_URL_FIELD: "Le champ 'long_url' est requis mais manquant.",
            
            UNEXPECTED_FIELD_IN_BODY: "Le corps contient un champ inattendu.",
           
            NOT_A_VALID_URL: "Le champ 'long_url' fourni n'est pas une URL valide.",
            
            TOO_LONG_URL: `L'URL est trop longue. La longueur maximale autorisée est de ${config.MAX_URL_LENGTH} caractères.`,
           
            HASH_COLLISION: "Une collision de hash a été détectée, veuillez réessayer.",
            
            DB_LIMIT_REACHED: "La base de données a atteint sa limite d'entrées.",
            
            WRITE_LIMIT_EXCEEDED: `Limite atteinte: ${config.MAX_DAILY_WRITES} requête${config.MAX_DAILY_WRITES > 1 ? 's' : ''} d'écriture autorisée${config.MAX_DAILY_WRITES > 1 ? 's' : ''} par jour.`,
           
            LINK_NOT_GENERATED: "Le lien n'a pas pu être généré. Réessayez plus tard...",

            ROOT_URL_MESSAGE: "Bienvenue à la racine de l'API. Consultez: https://github.com/Nde-Code/nsh pour plus d'informations.",
            
            INVALID_API_ENDPOINT: "La terminaison demandée est invalide.",

        },

    },

} as const;

export function buildLocalizedMessage(lang: supportedLang, labelKey: LabelKey, messageKey: MessageKey): Record<string, string> {
    
    const t = translations[lang] ?? translations["en"];

    const label = t.labels[labelKey] ?? labelKey;

    const message = t.messages[messageKey] ?? messageKey;

    return { [label]: message };

}

export function translateKey(lang: supportedLang, labelKey: LabelKey): string {

    const t = translations[lang] ?? translations["en"];

    return t.labels[labelKey] ?? labelKey;

}
