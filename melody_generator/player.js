
/**
 * Модуль воспроизведения сгенерированных мелодий
 */

class Player {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.isPlaying = false;
        this.scheduledNotes = [];
        this.currentTime = 0;
        this.masterGain = null;

        // Создаем основной узел громкости
        this.masterGain = audioContext.createGain();
        this.masterGain.connect(audioContext.destination);
        this.masterGain.gain.value = 0.7;
    }

    /**
     * Воспроизводит аудио данные
     * @param {Object} audioData - аудио данные
     * @returns {Promise} промис, который разрешается по окончании воспроизведения
     */
    async play(audioData) {
        if (this.isPlaying) {
            this.stop();
        }

        this.isPlaying = true;
        this.currentTime = this.audioContext.currentTime;
        this.scheduledNotes = [];

        // Планируем ноты для каждого трека
        audioData.tracks.forEach(track => {
            this.playTrack(track, audioData);
        });

        // Возвращаем промис, который разрешится по окончании воспроизведения
        return new Promise(resolve => {
            const endTime = this.currentTime + audioData.duration;

            const checkEnd = () => {
                if (this.audioContext.currentTime >= endTime) {
                    this.isPlaying = false;
                    resolve();
                } else {
                    setTimeout(checkEnd, 100);
                }
            };

            checkEnd();
        });
    }

    /**
     * Воспроизводит трек
     * @param {Object} track - данные трека
     * @param {Object} audioData - общие аудио данные
     */
    playTrack(track, audioData) {
        const { notes, instrument } = track;
        const { tempo } = audioData;

        notes.forEach(note => {
            const { pitch, startTime, duration, volume } = note;

            // Планируем ноту
            const noteStartTime = this.currentTime + startTime;
            const noteEndTime = noteStartTime + duration;

            // Создаем осциллятор для ноты
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            // Устанавливаем тип осциллятора
            oscillator.type = instrument;

            // Устанавливаем частоту (преобразуем название ноты в частоту)
            const frequency = this.getNoteFrequency(pitch);
            oscillator.frequency.value = frequency;

            // Настраиваем громкость
            gainNode.gain.value = volume || 0.5;

            // Создаем ADSR огибающую
            this.applyADSR(gainNode, noteStartTime, noteEndTime);

            // Подключаем узлы
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);

            // Планируем воспроизведение
            oscillator.start(noteStartTime);
            oscillator.stop(noteEndTime);

            // Сохраняем ссылку для возможной остановки
            this.scheduledNotes.push(oscillator);
        });
    }

    /**
     * Применяет ADSR огибающую к ноте
     * @param {GainNode} gainNode - узел громкости
     * @param {number} startTime - время начала ноты
     * @param {number} endTime - время окончания ноты
     */
    applyADSR(gainNode, startTime, endTime) {
        const attackTime = 0.1;
        const decayTime = 0.2;
        const sustainLevel = 0.7;
        const releaseTime = 0.3;

        // Начальная громкость (0)
        gainNode.gain.setValueAtTime(0, startTime);

        // Атака (плавное нарастание до максимальной громкости)
        gainNode.gain.linearRampToValueAtTime(1, startTime + attackTime);

        // Спад (уменьшение до уровня сустейна)
        gainNode.gain.linearRampToValueAtTime(sustainLevel, startTime + attackTime + decayTime);

        // Сустейн (удержание уровня)
        gainNode.gain.setValueAtTime(sustainLevel, endTime - releaseTime);

        // Релиз (плавное затухание)
        gainNode.gain.linearRampToValueAtTime(0, endTime);
    }

    /**
     * Получает частоту ноты по ее названию
     * @param {string} note - нота (например, 'C', 'D#')
     * @param {number} octave - октава (по умолчанию 4)
     * @returns {number} частота в Гц
     */
    getNoteFrequency(note, octave = 4) {
        // Частоты нот в 4-й октаве
        const noteFrequencies = {
            'C': 261.63,
            'C#': 277.18,
            'D': 293.66,
            'D#': 311.13,
            'E': 329.63,
            'F': 349.23,
            'F#': 369.99,
            'G': 392.00,
            'G#': 415.30,
            'A': 440.00,
            'A#': 466.16,
            'B': 493.88
        };

        const baseFreq = noteFrequencies[note];
        if (!baseFreq) {
            console.error(`Неизвестная нота: ${note}`);
            return 440; // A4 по умолчанию
        }

        // Корректируем частоту в зависимости от октавы
        return baseFreq * Math.pow(2, octave - 4);
    }

    /**
     * Останавливает воспроизведение
     */
    stop() {
        if (!this.isPlaying) return;

        this.isPlaying = false;

        // Останавливаем все запланированные ноты
        this.scheduledNotes.forEach(oscillator => {
            try {
                oscillator.stop();
            } catch (e) {
                // Игнорируем ошибки, если осциллятор уже остановлен
            }
        });

        this.scheduledNotes = [];
    }

    /**
     * Устанавливает громкость воспроизведения
     * @param {number} volume - громкость (0-1)
     */
    setVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
        }
    }
}
