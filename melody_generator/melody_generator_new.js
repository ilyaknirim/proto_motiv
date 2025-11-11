/**
 * Новый генератор спокойных, нарастающих мелодий для пробуждения
 * Создает разнообразные мелодии с постепенным увеличением громкости и темпа
 */

import { Scales } from './scales.js';
import { Patterns } from './patterns.js';
import { Player } from './player.js';

class MelodyGenerator {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.currentMelody = null;
        this.player = null;
        this.scales = new Scales();
        this.patterns = new Patterns();

        this.init();
    }

    async init() {
        // Создаем аудио контекст
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Инициализируем плеер
        this.player = new Player(this.audioContext);
    }

    /**
     * Генерирует и воспроизводит спокойную, нарастающую мелодию
     * @param {Object} options - опции генерации
     * @param {string} options.mood - настроение ('calm', 'gentle', 'peaceful')
     * @param {number} options.duration - длительность в секундах
     * @param {number} options.fadeInTime - время нарастания в секундах
     */
    async generateAndPlay(options = {}) {
        if (!this.audioContext) {
            console.error('Аудио контекст не инициализирован');
            return;
        }

        // Останавливаем предыдущее воспроизведение
        this.stop();

        // Устанавливаем опции по умолчанию
        const opts = {
            mood: options.mood || 'calm',
            duration: options.duration || 180, // 3 минуты по умолчанию
            fadeInTime: options.fadeInTime || 60, // 1 минута на нарастание
            ...options
        };

        // Генерируем мелодию
        const melodyData = this.generateCalmMelody(opts);

        // Воспроизводим
        this.currentMelody = melodyData;
        this.isPlaying = true;

        try {
            await this.player.play(melodyData);
        } catch (error) {
            console.error('Ошибка воспроизведения мелодии:', error);
        } finally {
            this.isPlaying = false;
        }

        return melodyData;
    }

    /**
     * Генерирует спокойную мелодию с постепенным нарастанием
     * @param {Object} options - опции генерации
     * @returns {Object} данные мелодии для воспроизведения
     */
    generateCalmMelody(options) {
        const { mood, duration, fadeInTime } = options;

        // Выбираем подходящую гамму
        const scale = this.scales.getScaleByMood(mood);

        // Генерируем паттерны
        const patterns = this.patterns.generateMelodyPattern(scale, { mood });

        // Создаем структуру мелодии
        const melody = {
            tracks: [],
            tempo: 60, // Начинаем медленно (60 BPM)
            duration: duration
        };

        // 1. Создаем трек мелодии (основная мелодия)
        const melodyTrack = this.createMelodyTrack(patterns.melody, scale, duration, fadeInTime);
        melody.tracks.push(melodyTrack);

        // 2. Создаем трек гармонии (аккорды для фона)
        const harmonyTrack = this.createHarmonyTrack(patterns.harmony, scale, duration, fadeInTime);
        melody.tracks.push(harmonyTrack);

        // 3. Создаем басовую линию (опционально, для более богатого звучания)
        if (Math.random() > 0.5) { // 50% шанс добавить бас
            const bassTrack = this.createBassTrack(patterns.bass, scale, duration, fadeInTime);
            melody.tracks.push(bassTrack);
        }

        return melody;
    }

    /**
     * Создает трек основной мелодии
     */
    createMelodyTrack(melodyPattern, scale, totalDuration, fadeInTime) {
        const notes = [];
        const baseTempo = 60; // BPM
        let currentTime = 0;
        let currentTempo = baseTempo;

        // Повторяем паттерн несколько раз с постепенным ускорением
        const patternDuration = melodyPattern.length * 0.5; // Предполагаем 0.5 сек на ноту
        const repetitions = Math.ceil(totalDuration / patternDuration);

        for (let rep = 0; rep < repetitions; rep++) {
            // Увеличиваем темп со временем (максимум до 80 BPM)
            const progress = rep / repetitions;
            currentTempo = baseTempo + (progress * 20);

            for (let i = 0; i < melodyPattern.length; i++) {
                const patternNote = melodyPattern[i];
                const noteDuration = 60 / currentTempo / 2; // Половина ноты в секундах

                // Вычисляем громкость с постепенным нарастанием
                const timeProgress = currentTime / totalDuration;
                let volume = 0.1; // Начинаем тихо

                if (timeProgress > 0.1) { // После первых 10% времени
                    const fadeProgress = Math.min((timeProgress - 0.1) / 0.4, 1); // Нарастание в первые 40%
                    volume = 0.1 + (fadeProgress * 0.4); // До 0.5 громкости
                }

                if (timeProgress > 0.5) { // После половины времени
                    const finalProgress = (timeProgress - 0.5) / 0.5;
                    volume = 0.5 + (finalProgress * 0.3); // До 0.8 громкости
                }

                // Добавляем небольшую вариацию громкости для естественности
                volume *= (0.8 + Math.random() * 0.4);

                notes.push({
                    pitch: patternNote.pitch,
                    startTime: currentTime,
                    duration: noteDuration,
                    volume: Math.min(volume, 0.8),
                    instrument: 'sine' // Мягкий синусоидальный звук
                });

                currentTime += noteDuration;
                if (currentTime >= totalDuration) break;
            }

            if (currentTime >= totalDuration) break;
        }

        return {
            notes: notes,
            instrument: 'sine'
        };
    }

    /**
     * Создает трек гармонии (фоновые аккорды)
     */
    createHarmonyTrack(harmonyPattern, scale, totalDuration, fadeInTime) {
        const notes = [];
        let currentTime = 0;

        // Каждый аккорд длится дольше, чем ноты мелодии
        const chordDuration = 4; // 4 секунды на аккорд
        const repetitions = Math.ceil(totalDuration / (harmonyPattern.length * chordDuration));

        for (let rep = 0; rep < repetitions; rep++) {
            for (let i = 0; i < harmonyPattern.length; i++) {
                const chord = harmonyPattern[i];

                // Вычисляем громкость аккорда
                const timeProgress = currentTime / totalDuration;
                let volume = 0.05; // Аккорды всегда тише мелодии

                if (timeProgress > 0.2) {
                    const fadeProgress = Math.min((timeProgress - 0.2) / 0.3, 1);
                    volume = 0.05 + (fadeProgress * 0.15); // До 0.2 громкости
                }

                // Добавляем каждую ноту аккорда
                chord.notes.forEach((note, noteIndex) => {
                    // Распределяем ноты аккорда по времени для арпеджио-эффекта
                    const noteOffset = (noteIndex * chordDuration) / chord.notes.length;

                    notes.push({
                        pitch: note,
                        startTime: currentTime + noteOffset,
                        duration: chordDuration / chord.notes.length,
                        volume: volume * (0.7 + Math.random() * 0.6), // Вариация громкости
                        instrument: 'triangle' // Треугольная волна для мягких аккордов
                    });
                });

                currentTime += chordDuration;
                if (currentTime >= totalDuration) break;
            }

            if (currentTime >= totalDuration) break;
        }

        return {
            notes: notes,
            instrument: 'triangle'
        };
    }

    /**
     * Создает басовую линию
     */
    createBassTrack(bassPattern, scale, totalDuration, fadeInTime) {
        const notes = [];
        let currentTime = 0;

        const noteDuration = 1; // 1 секунда на басовую ноту
        const repetitions = Math.ceil(totalDuration / (bassPattern.length * noteDuration));

        for (let rep = 0; rep < repetitions; rep++) {
            for (let i = 0; i < bassPattern.length; i++) {
                const bassNote = bassPattern[i];

                // Вычисляем громкость баса
                const timeProgress = currentTime / totalDuration;
                let volume = 0.08; // Бас всегда самый тихий

                if (timeProgress > 0.3) {
                    const fadeProgress = Math.min((timeProgress - 0.3) / 0.4, 1);
                    volume = 0.08 + (fadeProgress * 0.12); // До 0.2 громкости
                }

                notes.push({
                    pitch: bassNote.pitch,
                    startTime: currentTime,
                    duration: bassNote.duration,
                    volume: volume * (0.8 + Math.random() * 0.4),
                    instrument: 'sawtooth' // Пила для глубокого баса
                });

                currentTime += bassNote.duration;
                if (currentTime >= totalDuration) break;
            }

            if (currentTime >= totalDuration) break;
        }

        return {
            notes: notes,
            instrument: 'sawtooth'
        };
    }

    /**
     * Останавливает воспроизведение
     */
    stop() {
        if (!this.isPlaying) return;

        this.isPlaying = false;

        if (this.player) {
            this.player.stop();
        }

        this.currentMelody = null;
    }

    /**
     * Устанавливает громкость воспроизведения
     * @param {number} volume - громкость (0-1)
     */
    setVolume(volume) {
        if (this.player) {
            this.player.setVolume(volume);
        }
    }
}

// Экспортируем для использования в других модулях
export { MelodyGenerator };
