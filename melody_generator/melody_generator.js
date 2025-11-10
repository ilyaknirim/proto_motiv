
/**
 * Модуль генерации мелодий для пробуждения
 * Использует Web Audio API для создания приятных мелодий
 */

class MelodyGenerator {
    constructor() {
        this.audioContext = null;
        this.scales = null;
        this.patterns = null;
        this.player = null;

        // Инициализация после загрузки всех модулей
        this.init();
    }

    async init() {
        // Создаем аудио контекст
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Загружаем модули
        this.scales = new Scales();
        this.patterns = new Patterns();
        this.player = new Player(this.audioContext);
    }

    /**
     * Генерирует и воспроизводит новую мелодию
     * @param {Object} options - опции генерации
     * @param {string} options.mood - настроение мелодии ('calm', 'energetic', 'happy')
     * @param {number} options.duration - длительность в секундах
     * @param {number} options.tempo - темп в BPM
     */
    async generateAndPlay(options = {}) {
        if (!this.audioContext) {
            console.error('Аудио контекст не инициализирован');
            return;
        }

        // Устанавливаем опции по умолчанию
        const opts = {
            mood: options.mood || 'calm',
            duration: options.duration || 30,
            tempo: options.tempo || 80,
            ...options
        };

        // Выбираем гамму в зависимости от настроения
        const scale = this.scales.getScaleByMood(opts.mood);

        // Генерируем паттерн мелодии
        const melodyPattern = this.patterns.generateMelodyPattern(scale, opts);

        // Создаем аудио данные из паттерна
        const audioData = this.createAudioData(melodyPattern, opts);

        // Воспроизводим мелодию
        await this.player.play(audioData);

        return audioData;
    }

    /**
     * Создает аудио данные из паттерна мелодии
     * @param {Object} pattern - паттерн мелодии
     * @param {Object} options - опции воспроизведения
     * @returns {Object} аудио данные
     */
    createAudioData(pattern, options) {
        const { tempo, duration } = options;
        const beatTime = 60 / tempo; // длительность одного удара в секундах
        const totalBeats = Math.floor(duration / beatTime);

        // Создаем структуру аудио данных
        const audioData = {
            tempo: tempo,
            duration: duration,
            tracks: [
                {
                    name: 'melody',
                    instrument: 'sine',
                    notes: []
                },
                {
                    name: 'harmony',
                    instrument: 'triangle',
                    notes: []
                },
                {
                    name: 'bass',
                    instrument: 'sawtooth',
                    notes: []
                }
            ]
        };

        // Генерируем ноты для каждого трека
        for (let beat = 0; beat < totalBeats; beat++) {
            // Мелодия
            const melodyNote = pattern.melody[beat % pattern.melody.length];
            audioData.tracks[0].notes.push({
                pitch: melodyNote.pitch,
                startTime: beat * beatTime,
                duration: beatTime * 0.8,
                volume: 0.6
            });

            // Гармония (аккорды)
            if (beat % 2 === 0) { // аккорды меняются каждые 2 удара
                const chord = pattern.harmony[Math.floor(beat / 2) % pattern.harmony.length];
                chord.notes.forEach(note => {
                    audioData.tracks[1].notes.push({
                        pitch: note,
                        startTime: beat * beatTime,
                        duration: beatTime * 2,
                        volume: 0.3
                    });
                });
            }

            // Бас
            const bassNote = pattern.bass[beat % pattern.bass.length];
            audioData.tracks[2].notes.push({
                pitch: bassNote.pitch,
                startTime: beat * beatTime,
                duration: beatTime,
                volume: 0.5
            });
        }

        return audioData;
    }

    /**
     * Останавливает воспроизведение мелодии
     */
    stop() {
        if (this.player) {
            this.player.stop();
        }
    }
}
