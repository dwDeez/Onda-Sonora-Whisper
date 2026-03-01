import { ollama } from './ollamaApi';
import { promptService } from './promptService';

const WHISPER_URL = import.meta.env.VITE_WHISPER_URL || 'http://127.0.0.1:8080/inference';
console.log('[WhisperSession] Using WHISPER_URL:', WHISPER_URL);
const MAX_AUDIO_MS = 10000;    // Absolute max per turn
const SILENCE_LIMIT_MS = 1500; // Stop recording if quiet for 1.5s
const RMS_VAD_THRESHOLD = 0.02; // Threshold for presence of speech

export class WhisperAudioSession {
    private mediaRecorder: MediaRecorder | null = null;
    private stream: MediaStream | null = null;
    private synthesis: SpeechSynthesis;
    private isListening = false;
    private isProcessing = false;
    private systemInstruction: string = '';
    private messages: { role: string; content: string }[] = [];
    private audioCtx: AudioContext | null = null;

    public onTranscript?: (text: string, isUser: boolean) => void;
    public onStateChange?: (state: 'connecting' | 'connected' | 'disconnected' | 'error') => void;
    public onSpeakingWord?: () => void;

    constructor(context: string = 'CASUAL') {
        this.synthesis = window.speechSynthesis;
        this.systemInstruction = promptService.getSystemInstruction(context);
    }

    async connect() {
        this.onStateChange?.('connecting');
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.audioCtx = new AudioContext();
            this.isListening = true;
            this.onStateChange?.('connected');
            this.startRecordingLoop();
        } catch (err) {
            console.error('[WhisperSession] Failed to get microphone:', err);
            this.onStateChange?.('error');
        }
    }

    private startRecordingLoop() {
        if (!this.stream || !this.isListening || this.isProcessing || !this.audioCtx) return;

        const mimeType = this.getSupportedMimeType();
        const recorder = new MediaRecorder(this.stream, mimeType ? { mimeType } : undefined);
        this.mediaRecorder = recorder;

        // Set up real-time volume analyzer
        const source = this.audioCtx.createMediaStreamSource(this.stream);
        const analyser = this.audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const chunks: BlobPart[] = [];
        let lastActiveTime = Date.now();
        let hasSpeechBeenDetected = false;
        const startTime = Date.now();

        recorder.ondataavailable = (e) => {
            if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = async () => {
            source.disconnect();
            if (!this.isListening) return;

            const blob = new Blob(chunks, { type: mimeType || 'audio/webm' });
            chunks.length = 0;

            this.isProcessing = true;
            try {
                await this.sendToWhisper(blob);
            } finally {
                this.isProcessing = false;
            }

            if (this.isListening) {
                this.startRecordingLoop();
            }
        };

        const monitor = () => {
            if (recorder.state !== 'recording' || !this.isListening) return;

            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
            const avgEnergy = sum / dataArray.length;

            const now = Date.now();
            // Arbitrary sensitivity threshold based on FFT data
            if (avgEnergy > 5) {
                lastActiveTime = now;
                hasSpeechBeenDetected = true;
            }

            const silenceDuration = now - lastActiveTime;
            const totalDuration = now - startTime;

            if (totalDuration > MAX_AUDIO_MS || (hasSpeechBeenDetected && silenceDuration > SILENCE_LIMIT_MS)) {
                recorder.stop();
            } else {
                requestAnimationFrame(monitor);
            }
        };

        recorder.start();
        monitor();
    }

    private async sendToWhisper(audioBlob: Blob) {
        try {
            const wavBlob = await this.blobToWav(audioBlob);
            if (!wavBlob) return;

            const formData = new FormData();
            formData.append('file', wavBlob, 'audio.wav');
            formData.append('response_format', 'json');

            const response = await fetch(WHISPER_URL, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                console.warn('[WhisperSession] Server returned', response.status);
                return;
            }

            const data = await response.json();
            const text: string = (data.text || '').trim();

            if (!text) return; // silence / nothing recognized

            await this.handleUserInput(text);
        } catch (err) {
            console.error('[WhisperSession] sendToWhisper error:', err);
        }
    }

    /** Decode any browser audio format → WAV PCM 16-bit mono 16 kHz (returns null on silence) */
    private async blobToWav(blob: Blob): Promise<Blob | null> {
        try {
            const arrayBuffer = await blob.arrayBuffer();
            if (arrayBuffer.byteLength < 100) return null;

            const audioCtx = new AudioContext({ sampleRate: 16000 });
            let decoded: AudioBuffer;
            try {
                decoded = await audioCtx.decodeAudioData(arrayBuffer);
            } catch {
                await audioCtx.close();
                return null;
            }
            await audioCtx.close();

            // Downmix to mono
            const numChannels = decoded.numberOfChannels;
            const length = decoded.length;
            const mono = new Float32Array(length);
            for (let ch = 0; ch < numChannels; ch++) {
                const channelData = decoded.getChannelData(ch);
                for (let i = 0; i < length; i++) {
                    mono[i] += channelData[i] / numChannels;
                }
            }

            // Simple VAD: skip silent chunks (RMS energy below threshold)
            let sumSq = 0;
            for (let i = 0; i < mono.length; i++) sumSq += mono[i] * mono[i];
            const rms = Math.sqrt(sumSq / mono.length);
            if (rms < RMS_VAD_THRESHOLD) {
                console.debug('[WhisperSession] Silence detected (RMS:', rms.toFixed(4), ') — skipping chunk');
                return null;
            }

            return this.encodeWav(mono, decoded.sampleRate);
        } catch (err) {
            console.error('[WhisperSession] blobToWav error:', err);
            return null;
        }
    }

    /** Encode Float32 PCM samples → WAV Blob (16-bit, mono) */
    private encodeWav(samples: Float32Array, sampleRate: number): Blob {
        const numSamples = samples.length;
        const buffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(buffer);

        const writeStr = (offset: number, str: string) => {
            for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
        };
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));

        writeStr(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeStr(8, 'WAVE');
        writeStr(12, 'fmt ');
        view.setUint32(16, 16, true);       // PCM chunk size
        view.setUint16(20, 1, true);        // PCM format
        view.setUint16(22, 1, true);        // mono
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true); // byte rate
        view.setUint16(32, 2, true);        // block align
        view.setUint16(34, 16, true);       // bits per sample
        writeStr(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        for (let i = 0; i < numSamples; i++) {
            view.setInt16(44 + i * 2, clamp(samples[i]) * 0x7fff, true);
        }

        return new Blob([buffer], { type: 'audio/wav' });
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
            console.error('[WhisperSession] Ollama response error:', error);
        }
    }

    private speak(text: string) {
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';

        const voices = this.synthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google') || v.name.includes('Female')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.pitch = 0.8;
        utterance.rate = 1.0;

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                this.onSpeakingWord?.();
            }
        };

        this.synthesis.speak(utterance);
    }

    private getSupportedMimeType(): string {
        const candidates = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/mp4',
        ];
        return candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
    }

    disconnect() {
        this.isListening = false;

        if (this.audioCtx) {
            this.audioCtx.close().catch(console.error);
            this.audioCtx = null;
        }

        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(t => t.stop());
            this.stream = null;
        }

        this.synthesis.cancel();
        this.onStateChange?.('disconnected');
    }
}
