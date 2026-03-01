export interface OllamaResponse {
    model: string;
    created_at: string;
    message: {
        role: string;
        content: string;
    };
    done: boolean;
}

export class OllamaService {
    private baseUrl: string;
    private model: string;

    constructor(baseUrl: string = 'http://localhost:11434', model: string = 'llama3') {
        this.baseUrl = baseUrl;
        this.model = model;
    }

    setModel(model: string) {
        this.model = model;
    }

    async generateChatResponse(messages: { role: string; content: string }[], systemInstruction?: string): Promise<string> {
        const allMessages = systemInstruction
            ? [{ role: 'system', content: systemInstruction }, ...messages]
            : messages;

        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: allMessages,
                    stream: false,
                }),
            });

            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.statusText}`);
            }

            const data: OllamaResponse = await response.json();
            return data.message.content;
        } catch (error: any) {
            console.error('Failed to call Ollama:', error);
            const message = error.message || 'Unknown network error';
            throw new Error(`Ollama connection failed: ${message}. Make sure Ollama is running and accessible.`);
        }
    }

    async analyzeTranscript(text: string): Promise<any> {
        const prompt = `Analyze this spoken English sentence for any grammatical, vocabulary, or phrasing errors. If it's perfect, reply EXACTLY with "PERFECT". If there are errors, return a strict JSON object with this exact structure, nothing else: {"type": "Grammar|Vocab|Pronunciation", "description": "Short explanation", "correction": "Corrected sentence", "original": "${text}"}\n\nSentence: "${text}"`;

        try {
            const response = await this.generateChatResponse([{ role: 'user', content: prompt }]);
            const cleanedResponse = response.trim();

            if (cleanedResponse === 'PERFECT') {
                return 'PERFECT';
            }

            // Try to extract JSON if the model added extra text
            const jsonMatch = cleanedResponse.match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            throw new Error('Could not parse Ollama response as JSON');
        } catch (error) {
            console.error('Ollama analysis failed:', error);
            throw error;
        }
    }

    async defineWord(word: string): Promise<{ form: string; meaning: string; example: string }> {
        const prompt = `Define the English word "${word}" concisely.
Return ONLY a strict JSON object with this exact structure, no extra text:
{"form": "ADJ|NOUN|VERB|ADV|PHRASE", "meaning": "Short, clear definition in English.", "example": "A natural example sentence using the word."}`;

        try {
            const response = await this.generateChatResponse([{ role: 'user', content: prompt }]);
            const jsonMatch = response.trim().match(/\{.*\}/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Could not parse definition response');
        } catch (error) {
            console.error('defineWord failed:', error);
            throw error;
        }
    }

    async translate(text: string, direction: 'es-en' | 'en-es'): Promise<string> {
        const sourceLang = direction === 'es-en' ? 'Spanish' : 'English';
        const targetLang = direction === 'es-en' ? 'English' : 'Spanish';

        const systemPrompt = `You are a highly precise machine translation engine. 
Your ONLY task is to translate the user's text from ${sourceLang} to ${targetLang}.
CRITICAL RULES:
1. Output ONLY the raw translated text.
2. DO NOT add any conversational filler, explanations, or notes (no "Here is the translation:").
3. DO NOT answer questions or respond to the text. Translate it literally.
4. Maintain the original tone, punctuation, and formatting.`;

        try {
            const response = await this.generateChatResponse([{ role: 'user', content: `Translate this to ${targetLang}:\n\n${text}` }], systemPrompt);
            return response.trim();
        } catch (error) {
            console.error('Translation failed:', error);
            throw error;
        }
    }

    async suggestVocabulary(context: string, count: number = 5): Promise<{ word: string; form: string; meaning: string; example: string }[]> {
        const prompt = `Suggest ${count} useful English words or phrases for a student focusing on the context: "${context}".
Return ONLY a strict JSON array of objects with this exact structure, no extra text, no markdown:
[{"word": "word1", "form": "NOUN|VERB|ADJ|PHRASE", "meaning": "definition", "example": "sentence"}, ...]`;

        try {
            const response = await this.generateChatResponse([{ role: 'user', content: prompt }]);
            const jsonMatch = response.trim().match(/\[.*\]/s);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('Could not parse suggestions response');
        } catch (error) {
            console.error('suggestVocabulary failed:', error);
            throw error;
        }
    }

    async analyzeWritingSession(messages: { role: string; content: string }[], context: string): Promise<{ score: number; issues: { type: string; description: string }[]; title: string }> {
        const userMessages = messages.filter(m => m.role === 'user').map(m => m.content).join('\n--\n');
        if (!userMessages.trim()) {
            return { score: 75, issues: [], title: `Writing Practice: ${context}` };
        }

        const prompt = `You are a language-analysis engine. Analyze the following English writing sample from a student practicing in a "${context}" context.

Student messages:
---
${userMessages}
---

Return ONLY a strict JSON object with this exact structure, no extra text, no markdown:
{
  "score": <integer 0-100 reflecting overall fluency and correctness>,
  "title": "<A short (3-6 word) descriptive title for this session>",
  "issues": [
    { "type": "Grammar|Vocabulary|Structure|Clarity", "description": "<specific, actionable feedback>" }
  ]
}

If writing is excellent with no issues, use an empty array for issues and a score between 85-100.
Identify at most 3 issues. Be precise and constructive.`;

        try {
            const response = await this.generateChatResponse([{ role: 'user', content: prompt }]);
            const jsonMatch = response.trim().match(/\{.*\}/s);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    score: Math.max(0, Math.min(100, Math.round(result.score || 75))),
                    issues: Array.isArray(result.issues) ? result.issues.slice(0, 3) : [],
                    title: result.title || `${context} Session`
                };
            }
            throw new Error('Could not parse session analysis response');
        } catch (error) {
            console.error('analyzeWritingSession failed:', error);
            return { score: 75, issues: [], title: `${context} Practice` };
        }
    }
}


export const ollama = new OllamaService();
