import { promptService } from './src/services/promptService';

const contexts = ['BUSINESS', 'ACADEMIC', 'TECHNICAL', 'CASUAL'];

console.log("--- PROMPT VERIFICATION ---\n");

contexts.forEach(context => {
    const prompt = promptService.getSystemInstruction(context);
    console.log(`CONTEXT: ${context}`);
    console.log("FEEDBACK ELEMENTS CHECK:");
    const hasCoach = prompt.includes("English Pronunciation Coach");
    const hasFeedback = prompt.includes("feedback on their pronunciation");
    const hasFormal = prompt.includes("[FORMAL]");
    const hasCasual = prompt.includes("[CASUAL]");
    const hasRepeat = prompt.includes("repeat the corrected or improved version aloud");

    console.log(`- Coach Role: ${hasCoach ? 'YES' : 'NO'}`);
    console.log(`- Pronunciation Feedback: ${hasFeedback ? 'YES' : 'NO'}`);
    console.log(`- Formal/Casual Alts: ${hasFormal && hasCasual ? 'YES' : 'NO'}`);
    console.log(`- Repetition Encouragement: ${hasRepeat ? 'YES' : 'NO'}`);

    if (!(hasCoach && hasFeedback && hasFormal && hasCasual && hasRepeat)) {
        console.error(`!!! FAILED: Missing elements in ${context} prompt`);
    }
    console.log("---------------------------\n");
});

console.log("Verification complete.");
