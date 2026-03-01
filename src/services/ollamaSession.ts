import { ollama } from './ollamaApi';
import { promptService } from './promptService';

export class OllamaAudioSession {
    private recognition: any = null;
    private synthesis: SpeechSynthesis;
    private isListening = false;
    private systemInstruction: string = '';
    private messages: { role: string; content: string }[] = [];

    public onTranscript?: (text: string, isUser: boolean) => void;
    public onStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
    public onSpeakingWord?: () => void;

    constructor(context: string = 'CASUAL') {
        this.synthesis = window.speechSynthesis;
        this.systemInstruction = promptService.getSystemInstruction(context);

        // Check for browser support
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = false;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event: any) => {
                const last = event.results.length - 1;
                const text = event.results[last][0].transcript;
                this.handleUserInput(text);
            };

            this.recognition.onerror = (event: any) => {
                console.error('Speech recognition error', event.error);
                if (event.error !== 'no-speech') {
                    this.onStateChange?.('error');
                }
            };

            this.recognition.onend = () => {
                if (this.isListening) {
                    this.recognition.start();
                }
            };
        }
    }

    async connect() {
        this.onStateChange?.('connecting');
        try {
            if (!this.recognition) {
                throw new Error('Speech recognition not supported in this browser.');
            }
            this.isListening = true;
            this.recognition.start();
            this.onStateChange?.('connected');
        } catch (err) {
            console.error('Failed to start local audio session:', err);
            this.onStateChange?.('error');
        }
    }

    private async handleUserInput(text: string) {
        this.onTranscript?.(text, true);
        this.messages.push({ role: 'user', content: text });

        try {
            const response = await ollama.generateChatResponse(this.messages, this.systemInstruction);
            this.messages.push({ role: 'assistant', content: response });
            this.onTranscript?.(response, false);
            this.speak(response);
        } catch (error) {
            console.error('Ollama response error:', error);
        }
    }

    private speak(text: string) {
        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        // Attempt to find a "cool" voice if possible, otherwise default
        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female')) || voices[0];
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        utterance.pitch = 0.8; // Slightly deeper for cyber-noir feel
        utterance.rate = 1.0;

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                this.onSpeakingWord?.();
            }
        };

        this.synthesis.speak(utterance);
    }

    disconnect() {
        this.isListening = false;
        this.recognition?.stop();
        this.synthesis.cancel();
        this.onStateChange?.('disconnected');
    }
}
