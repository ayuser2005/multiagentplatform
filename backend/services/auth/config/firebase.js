import { cert, initializeApp, applicationDefault } from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Resolve a Firebase Admin credential without ever requiring a committed
 * service-account JSON file.
 *
 * Resolution order:
 *   1. FIREBASE_SERVICE_ACCOUNT_PATH -> path to a service account JSON file
 *   2. FIREBASE_SERVICE_ACCOUNT_JSON -> inline service account JSON
 *   3. ../serviceAccountKey.json        -> legacy local file (git-ignored)
 *   4. Application Default Credentials  -> GOOGLE_APPLICATION_CREDENTIALS / workload identity
 */
const resolveCredential = () => {
    const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (keyPath) {
        if (!fs.existsSync(keyPath)) {
            throw new Error(
                `FIREBASE_SERVICE_ACCOUNT_PATH is set to "${keyPath}" but that file does not exist.`
            );
        }
        return cert(JSON.parse(fs.readFileSync(keyPath, "utf8")));
    }

    const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (inlineJson) {
        try {
            return cert(JSON.parse(inlineJson));
        } catch (error) {
            throw new Error(
                "FIREBASE_SERVICE_ACCOUNT_JSON could not be parsed as JSON. " +
                `Original error: ${error.message}`
            );
        }
    }

    const legacyPath = path.join(__dirname, "..", "serviceAccountKey.json");
    if (fs.existsSync(legacyPath)) {
        return cert(JSON.parse(fs.readFileSync(legacyPath, "utf8")));
    }

    // Falls back to GOOGLE_APPLICATION_CREDENTIALS / workload identity / metadata server.
    console.warn(
        "[firebase] No service account configured. Falling back to Application Default Credentials."
    );
    return applicationDefault();
};

export const app = initializeApp({
    credential: resolveCredential()
});
