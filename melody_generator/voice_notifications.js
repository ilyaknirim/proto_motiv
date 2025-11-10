/**
 * Модуль голосовых уведомлений
 */

class VoiceNotifications {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        this.selectedVoice = null;
        this.volume = 0.7;

        // Загружаем доступные голоса
        this.loadVoices();

        // Обработчик изменения списка голосов
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    /**
     * Загружает доступные голоса
     */
    loadVoices() {
        this.voices = this.synthesis.getVoices();

        // Выбираем русский голос по умолчанию
        this.selectedVoice = this.voices.find(voice => 
            voice.lang.includes('ru') || voice.lang.includes('RU')
        ) || this.voices[0];
    }

    /**
     * Устанавливает громкость голоса
     * @param {number} volume - громкость (0-1)
     */
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    /**
     * Произносит текст
     * @param {string} text - текст для произношения
     * @returns {Promise} промис, который разрешается по окончании произношения
     */
    speak(text) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech Synthesis не поддерживается в этом браузере'));
                return;
            }

            // Отменяем предыдущее произношение
            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.selectedVoice;
            utterance.volume = this.volume;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;

            utterance.onend = () => resolve();
            utterance.onerror = (event) => reject(event.error);

            this.synthesis.speak(utterance);
        });
    }

    /**
     * Останавливает произношение
     */
    stop() {
        if (this.synthesis) {
            this.synthesis.cancel();
        }
    }

    /**
     * Возвращает список доступных голосов
     * @returns {Array} массив голосов
     */
    getVoices() {
        return this.voices;
    }

    /**
     * Устанавливает голос по индексу
     * @param {number} index - индекс голоса
     */
    setVoiceByIndex(index) {
        if (index >= 0 && index < this.voices.length) {
            this.selectedVoice = this.voices[index];
        }
    }
}
