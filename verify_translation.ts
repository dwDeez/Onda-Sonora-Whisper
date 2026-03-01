import { ollama } from './src/services/ollamaApi';

async function verifyTranslation() {
    console.log("--- TRANSLATION VERIFICATION ---\n");

    try {
        console.log("Testing ES -> EN...");
        const esContent = "Hola, ¿cómo estás hoy?";
        const enResult = await ollama.translate(esContent, 'es-en');
        console.log(`Input: ${esContent}`);
        console.log(`Output: ${enResult}`);
        if (enResult.toLowerCase().includes("hello") || enResult.toLowerCase().includes("how are you")) {
            console.log("ES -> EN: SUCCESS\n");
        } else {
            console.error("ES -> EN: FAILED (Unexpected output)\n");
        }

        console.log("Testing EN -> ES...");
        const enContent = "I want to learn English vocabulary.";
        const esResult = await ollama.translate(enContent, 'en-es');
        console.log(`Input: ${enContent}`);
        console.log(`Output: ${esResult}`);
        if (esResult.toLowerCase().includes("vocabulario") || esResult.toLowerCase().includes("aprender")) {
            console.log("EN -> ES: SUCCESS\n");
        } else {
            console.error("EN -> ES: FAILED (Unexpected output)\n");
        }

    } catch (error) {
        console.error("Verification FAILED with error:", error);
    }

    console.log("Verification complete.");
}

verifyTranslation();
