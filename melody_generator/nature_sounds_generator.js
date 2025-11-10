/**
 * Модуль генерации атмосферных звуков природы для пробуждения
 * Использует Web Audio API для создания естественных звуков с постепенным нарастанием
 */

class NatureSoundsGenerator {
    constructor() {
        this.audioContext = null;
        this.isPlaying = false;
        this.activeSources = [];
        this.gainNodes = [];

        // Инициализация после загрузки всех модулей
        this.init();
    }

    async init() {
        // Создаем аудио контекст
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Генерирует и воспроизводит атмосферные звуки природы
     * @param {Object} options - опции генерации
     * @param {string} options.environment - тип среды ('forest', 'ocean', 'rain', 'morning')
     * @param {number} options.duration - длительность в секундах
     * @param {number} options.fadeInTime - время нарастания звука в секундах
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
            environment: options.environment || 'forest',
            duration: options.duration || 120, // 2 минуты по умолчанию
            fadeInTime: options.fadeInTime || 30, // 30 секунд на нарастание
            ...options
        };

        // Создаем звуки в зависимости от типа среды
        switch (opts.environment) {
            case 'forest':
                await this.createForestSounds(opts);
                break;
            case 'ocean':
                await this.createOceanSounds(opts);
                break;
            case 'rain':
                await this.createRainSounds(opts);
                break;
            case 'morning':
                await this.createMorningSounds(opts);
                break;
            default:
                await this.createForestSounds(opts);
        }

        return { environment: opts.environment, duration: opts.duration };
    }

    /**
     * Создает звуки леса: шелест листьев, пение птиц, тихий ветер
     * @param {Object} options - опции генерации
     */
    async createForestSounds(options) {
        const { duration, fadeInTime } = options;

        // Создаем основной узел громкости для всего звука
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = 0; // Начинаем с тишины
        masterGain.connect(this.audioContext.destination);
        this.gainNodes.push(masterGain);

        // 1. Шелест листьев (белый шум с фильтром)
        const leavesNoise = this.createWhiteNoise();
        const leavesFilter = this.audioContext.createBiquadFilter();
        leavesFilter.type = 'lowpass';
        leavesFilter.frequency.value = 800;
        leavesFilter.Q.value = 1;

        const leavesGain = this.audioContext.createGain();
        leavesGain.gain.value = 0.15;

        leavesNoise.connect(leavesFilter);
        leavesFilter.connect(leavesGain);
        leavesGain.connect(masterGain);

        // Добавляем модуляцию для имитации шелеста
        const leavesLFO = this.audioContext.createOscillator();
        leavesLFO.frequency.value = 0.2; // Медленные колебания

        const leavesLFOModulator = this.audioContext.createGain();
        leavesLFOModulator.gain.value = 200; // Глубина модуляции

        leavesLFO.connect(leavesLFOModulator);
        leavesLFOModulator.connect(leavesFilter.frequency);

        leavesLFO.start();
        this.activeSources.push(leavesLFO);

        // 2. Пение птиц (короткие тональные всплески)
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                if (!this.isPlaying) return;

                const birdOsc = this.audioContext.createOscillator();
                const birdGain = this.audioContext.createGain();

                // Случайная частота в диапазоне птичьих звуков
                const baseFreq = 2000 + Math.random() * 2000;
                birdOsc.frequency.value = baseFreq;
                birdOsc.type = 'sine';

                // Кратковременное звучание
                const now = this.audioContext.currentTime;
                birdGain.gain.setValueAtTime(0, now);
                birdGain.gain.linearRampToValueAtTime(0.1, now + 0.05);
                birdGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

                birdOsc.connect(birdGain);
                birdGain.connect(masterGain);

                birdOsc.start(now);
                birdOsc.stop(now + 0.5);

                this.activeSources.push(birdOsc);

                // Повторяем пение птиц
                if (this.isPlaying) {
                    const nextTime = 3000 + Math.random() * 7000; // 3-10 секунд
                    setTimeout(() => this.createForestSounds(options), nextTime);
                }
            }, i * (2000 + Math.random() * 3000)); // Разные интервалы для каждой птицы
        }

        // 3. Тихий ветер (низкочастотный гул)
        const windOsc = this.audioContext.createOscillator();
        windOsc.frequency.value = 80;
        windOsc.type = 'sine';

        const windGain = this.audioContext.createGain();
        windGain.gain.value = 0.05;

        // Модуляция громкости ветра
        const windLFO = this.audioContext.createOscillator();
        windLFO.frequency.value = 0.1; // Очень медленные колебания

        const windLFOModulator = this.audioContext.createGain();
        windLFOModulator.gain.value = 0.03;

        windLFO.connect(windLFOModulator);
        windLFOModulator.connect(windGain.gain);

        windOsc.connect(windGain);
        windGain.connect(masterGain);

        windOsc.start();
        windLFO.start();

        this.activeSources.push(windOsc, windLFO);

        // Постепенное нарастание громкости
        this.fadeIn(masterGain, fadeInTime);

        // Устанавливаем флаг воспроизведения
        this.isPlaying = true;

        // Автоматическая остановка через указанное время
        setTimeout(() => {
            if (this.isPlaying) {
                this.fadeOutAndStop(masterGain, 5); // 5 секунд на затухание
            }
        }, duration * 1000);
    }

    /**
     * Создает звуки океана: волны, чайки, прибой
     * @param {Object} options - опции генерации
     */
    async createOceanSounds(options) {
        const { duration, fadeInTime } = options;

        // Создаем основной узел громкости для всего звука
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = 0; // Начинаем с тишины
        masterGain.connect(this.audioContext.destination);
        this.gainNodes.push(masterGain);

        // 1. Звук волн (розовый шум с фильтром)
        const wavesNoise = this.createPinkNoise();
        const wavesFilter = this.audioContext.createBiquadFilter();
        wavesFilter.type = 'bandpass';
        wavesFilter.frequency.value = 300;
        wavesFilter.Q.value = 0.5;

        const wavesGain = this.audioContext.createGain();
        wavesGain.gain.value = 0.2;

        wavesNoise.connect(wavesFilter);
        wavesFilter.connect(wavesGain);
        wavesGain.connect(masterGain);

        // Модуляция для имитации волн
        const wavesLFO = this.audioContext.createOscillator();
        wavesLFO.frequency.value = 0.15; // Медленные колебания волн

        const wavesLFOModulator = this.audioContext.createGain();
        wavesLFOModulator.gain.value = 150; // Глубина модуляции

        wavesLFO.connect(wavesLFOModulator);
        wavesLFOModulator.connect(wavesFilter.frequency);

        wavesLFO.start();
        this.activeSources.push(wavesLFO);

        // 2. Звук прибоя (низкочастотные всплески)
        const createSurf = () => {
            if (!this.isPlaying) return;

            const surfNoise = this.createWhiteNoise();
            const surfFilter = this.audioContext.createBiquadFilter();
            surfFilter.type = 'lowpass';
            surfFilter.frequency.value = 400;

            const surfGain = this.audioContext.createGain();

            const now = this.audioContext.currentTime;
            surfGain.gain.setValueAtTime(0, now);
            surfGain.gain.linearRampToValueAtTime(0.3, now + 1);
            surfGain.gain.exponentialRampToValueAtTime(0.01, now + 3);

            surfNoise.connect(surfFilter);
            surfFilter.connect(surfGain);
            surfGain.connect(masterGain);

            surfNoise.start(now);
            surfNoise.stop(now + 3);

            this.activeSources.push(surfNoise);

            // Повторяем звук прибоя
            if (this.isPlaying) {
                const nextTime = 4000 + Math.random() * 6000; // 4-10 секунд
                setTimeout(createSurf, nextTime);
            }
        };

        // Запускаем несколько звуков прибоя с разными интервалами
        for (let i = 0; i < 3; i++) {
            setTimeout(createSurf, i * (3000 + Math.random() * 4000));
        }

        // 3. Крики чаек (высокочастотные тона)
        const createGullSound = () => {
            if (!this.isPlaying) return;

            const gullOsc = this.audioContext.createOscillator();
            const gullGain = this.audioContext.createGain();

            // Случайная частота в диапазоне звуков чаек
            const baseFreq = 800 + Math.random() * 400;
            gullOsc.frequency.value = baseFreq;
            gullOsc.type = 'sine';

            // Изменение частоты для крика
            const now = this.audioContext.currentTime;
            gullOsc.frequency.setValueAtTime(baseFreq, now);
            gullOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.2);
            gullOsc.frequency.exponentialRampToValueAtTime(baseFreq, now + 0.4);

            // Кратковременное звучание
            gullGain.gain.setValueAtTime(0, now);
            gullGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
            gullGain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            gullOsc.connect(gullGain);
            gullGain.connect(masterGain);

            gullOsc.start(now);
            gullOsc.stop(now + 0.5);

            this.activeSources.push(gullOsc);

            // Повторяем крики чаек
            if (this.isPlaying) {
                const nextTime = 5000 + Math.random() * 10000; // 5-15 секунд
                setTimeout(createGullSound, nextTime);
            }
        };

        // Запускаем несколько звуков чаек с разными интервалами
        for (let i = 0; i < 2; i++) {
            setTimeout(createGullSound, i * (8000 + Math.random() * 7000));
        }

        // Постепенное нарастание громкости
        this.fadeIn(masterGain, fadeInTime);

        // Устанавливаем флаг воспроизведения
        this.isPlaying = true;

        // Автоматическая остановка через указанное время
        setTimeout(() => {
            if (this.isPlaying) {
                this.fadeOutAndStop(masterGain, 5); // 5 секунд на затухание
            }
        }, duration * 1000);
    }

    /**
     * Создает звуки дождя: капли, гром, далекий шум
     * @param {Object} options - опции генерации
     */
    async createRainSounds(options) {
        const { duration, fadeInTime } = options;

        // Создаем основной узел громкости для всего звука
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = 0; // Начинаем с тишины
        masterGain.connect(this.audioContext.destination);
        this.gainNodes.push(masterGain);

        // 1. Общий шум дождя (белый шум с фильтром)
        const rainNoise = this.createWhiteNoise();
        const rainFilter = this.audioContext.createBiquadFilter();
        rainFilter.type = 'highpass';
        rainFilter.frequency.value = 300;
        rainFilter.Q.value = 1;

        const rainGain = this.audioContext.createGain();
        rainGain.gain.value = 0.1;

        rainNoise.connect(rainFilter);
        rainFilter.connect(rainGain);
        rainGain.connect(masterGain);

        // 2. Капли дождя (короткие всплески)
        const createRaindrop = () => {
            if (!this.isPlaying) return;

            const dropNoise = this.createWhiteNoise();
            const dropFilter = this.audioContext.createBiquadFilter();
            dropFilter.type = 'highpass';
            dropFilter.frequency.value = 2000;

            const dropGain = this.audioContext.createGain();

            const now = this.audioContext.currentTime;
            dropGain.gain.setValueAtTime(0, now);
            dropGain.gain.linearRampToValueAtTime(0.05, now + 0.01);
            dropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

            dropNoise.connect(dropFilter);
            dropFilter.connect(dropGain);
            dropGain.connect(masterGain);

            dropNoise.start(now);
            dropNoise.stop(now + 0.1);

            this.activeSources.push(dropNoise);

            // Повторяем капли
            if (this.isPlaying) {
                const nextTime = 100 + Math.random() * 500; // Очень частые капли
                setTimeout(createRaindrop, nextTime);
            }
        };

        // Запускаем несколько потоков капель
        for (let i = 0; i < 5; i++) {
            setTimeout(createRaindrop, i * 200);
        }

        // 3. Далекий гром (низкочастотные раскатывания)
        const createThunder = () => {
            if (!this.isPlaying) return;

            const thunderNoise = this.createWhiteNoise();
            const thunderFilter = this.audioContext.createBiquadFilter();
            thunderFilter.type = 'lowpass';
            thunderFilter.frequency.value = 100;

            const thunderGain = this.audioContext.createGain();

            const now = this.audioContext.currentTime;
            thunderGain.gain.setValueAtTime(0, now);
            thunderGain.gain.linearRampToValueAtTime(0.2, now + 0.5);
            thunderGain.gain.exponentialRampToValueAtTime(0.05, now + 2);

            // Модуляция громкости для имитации раскатов
            const thunderLFO = this.audioContext.createOscillator();
            thunderLFO.frequency.value = 5; // Колебания громкости

            const thunderLFOModulator = this.audioContext.createGain();
            thunderLFOModulator.gain.value = 0.1;

            thunderLFO.connect(thunderLFOModulator);
            thunderLFOModulator.connect(thunderGain.gain);

            thunderNoise.connect(thunderFilter);
            thunderFilter.connect(thunderGain);
            thunderGain.connect(masterGain);

            thunderNoise.start(now);
            thunderNoise.stop(now + 3);
            thunderLFO.start(now);
            thunderLFO.stop(now + 3);

            this.activeSources.push(thunderNoise, thunderLFO);

            // Повторяем гром
            if (this.isPlaying) {
                const nextTime = 10000 + Math.random() * 20000; // 10-30 секунд
                setTimeout(createThunder, nextTime);
            }
        };

        // Запускаем первый гром через некоторое время
        setTimeout(createThunder, 5000 + Math.random() * 10000);

        // Постепенное нарастание громкости
        this.fadeIn(masterGain, fadeInTime);

        // Устанавливаем флаг воспроизведения
        this.isPlaying = true;

        // Автоматическая остановка через указанное время
        setTimeout(() => {
            if (this.isPlaying) {
                this.fadeOutAndStop(masterGain, 5); // 5 секунд на затухание
            }
        }, duration * 1000);
    }

    /**
     * Создает утренние звуки: пение птиц, роса, тихий ветер
     * @param {Object} options - опции генерации
     */
    async createMorningSounds(options) {
        const { duration, fadeInTime } = options;

        // Создаем основной узел громкости для всего звука
        const masterGain = this.audioContext.createGain();
        masterGain.gain.value = 0; // Начинаем с тишины
        masterGain.connect(this.audioContext.destination);
        this.gainNodes.push(masterGain);

        // 1. Тихий ветерок (очень низкочастотный гул)
        const breezeNoise = this.createWhiteNoise();
        const breezeFilter = this.audioContext.createBiquadFilter();
        breezeFilter.type = 'lowpass';
        breezeFilter.frequency.value = 200;

        const breezeGain = this.audioContext.createGain();
        breezeGain.gain.value = 0.05;

        // Модуляция для имитации легкого ветра
        const breezeLFO = this.audioContext.createOscillator();
        breezeLFO.frequency.value = 0.08; // Очень медленные колебания

        const breezeLFOModulator = this.audioContext.createGain();
        breezeLFOModulator.gain.value = 0.03;

        breezeLFO.connect(breezeLFOModulator);
        breezeLFOModulator.connect(breezeGain.gain);

        breezeNoise.connect(breezeFilter);
        breezeFilter.connect(breezeGain);
        breezeGain.connect(masterGain);

        breezeLFO.start();
        this.activeSources.push(breezeLFO);

        // 2. Пение птиц (более разнообразное, чем в лесу)
        const createBirdSong = () => {
            if (!this.isPlaying) return;

            const birdOsc = this.audioContext.createOscillator();
            const birdGain = this.audioContext.createGain();

            // Случайная частота в диапазоне птичьих звуков
            const baseFreq = 1500 + Math.random() * 2500;
            birdOsc.frequency.value = baseFreq;
            birdOsc.type = 'sine';

            // Создаем мелодичное пение с изменением частоты
            const now = this.audioContext.currentTime;
            const songLength = 0.5 + Math.random() * 1.5; // 0.5-2 секунды

            // Начальная частота
            birdOsc.frequency.setValueAtTime(baseFreq, now);

            // Создаем случайную мелодию из 3-5 нот
            const notesCount = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < notesCount; i++) {
                const noteTime = now + (i * songLength / notesCount);
                const nextFreq = baseFreq * (0.8 + Math.random() * 0.4); // Вариации частоты
                birdOsc.frequency.linearRampToValueAtTime(nextFreq, noteTime);
            }

            // Громкость
            birdGain.gain.setValueAtTime(0, now);
            birdGain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            birdGain.gain.linearRampToValueAtTime(0.1, now + songLength - 0.1);
            birdGain.gain.exponentialRampToValueAtTime(0.01, now + songLength);

            birdOsc.connect(birdGain);
            birdGain.connect(masterGain);

            birdOsc.start(now);
            birdOsc.stop(now + songLength);

            this.activeSources.push(birdOsc);

            // Повторяем пение птиц
            if (this.isPlaying) {
                const nextTime = 2000 + Math.random() * 8000; // 2-10 секунд
                setTimeout(createBirdSong, nextTime);
            }
        };

        // Запускаем несколько птиц с разными интервалами
        for (let i = 0; i < 4; i++) {
            setTimeout(createBirdSong, i * (1000 + Math.random() * 3000));
        }

        // 3. Звук капель росы (очень короткие и тихие всплески)
        const createDewdrop = () => {
            if (!this.isPlaying) return;

            const dewdropNoise = this.createWhiteNoise();
            const dewdropFilter = this.audioContext.createBiquadFilter();
            dewdropFilter.type = 'highpass';
            dewdropFilter.frequency.value = 3000;

            const dewdropGain = this.audioContext.createGain();

            const now = this.audioContext.currentTime;
            dewdropGain.gain.setValueAtTime(0, now);
            dewdropGain.gain.linearRampToValueAtTime(0.02, now + 0.01);
            dewdropGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            dewdropNoise.connect(dewdropFilter);
            dewdropFilter.connect(dewdropGain);
            dewdropGain.connect(masterGain);

            dewdropNoise.start(now);
            dewdropNoise.stop(now + 0.05);

            this.activeSources.push(dewdropNoise);

            // Повторяем капли росы
            if (this.isPlaying) {
                const nextTime = 500 + Math.random() * 1500; // 0.5-2 секунды
                setTimeout(createDewdrop, nextTime);
            }
        };

        // Запускаем несколько потоков капель росы
        for (let i = 0; i < 3; i++) {
            setTimeout(createDewdrop, i * 700);
        }

        // Постепенное нарастание громкости
        this.fadeIn(masterGain, fadeInTime);

        // Устанавливаем флаг воспроизведения
        this.isPlaying = true;

        // Автоматическая остановка через указанное время
        setTimeout(() => {
            if (this.isPlaying) {
                this.fadeOutAndStop(masterGain, 5); // 5 секунд на затухание
            }
        }, duration * 1000);
    }

    /**
     * Создает белый шум
     * @returns {AudioBufferSourceNode} источник белого шума
     */
    createWhiteNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.audioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        whiteNoise.start(0);

        this.activeSources.push(whiteNoise);
        return whiteNoise;
    }

    /**
     * Создает розовый шум
     * @returns {AudioBufferSourceNode} источник розового шума
     */
    createPinkNoise() {
        const bufferSize = 2 * this.audioContext.sampleRate;
        const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);

        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;

        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }

        const pinkNoise = this.audioContext.createBufferSource();
        pinkNoise.buffer = noiseBuffer;
        pinkNoise.loop = true;
        pinkNoise.start(0);

        this.activeSources.push(pinkNoise);
        return pinkNoise;
    }

    /**
     * Постепенно увеличивает громкость
     * @param {GainNode} gainNode - узел громкости
     * @param {number} duration - время нарастания в секундах
     */
    fadeIn(gainNode, duration) {
        const now = this.audioContext.currentTime;
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.7, now + duration);
    }

    /**
     * Постепенно уменьшает громкость и останавливает воспроизведение
     * @param {GainNode} gainNode - узел громкости
     * @param {number} duration - время затухания в секундах
     */
    fadeOutAndStop(gainNode, duration) {
        const now = this.audioContext.currentTime;
        gainNode.gain.linearRampToValueAtTime(0, now + duration);

        setTimeout(() => {
            this.stop();
        }, duration * 1000);
    }

    /**
     * Останавливает воспроизведение
     */
    stop() {
        if (!this.isPlaying) return;

        this.isPlaying = false;

        // Останавливаем все активные источники
        this.activeSources.forEach(source => {
            try {
                if (source.stop) {
                    source.stop(0);
                } else if (source.disconnect) {
                    source.disconnect();
                }
            } catch (e) {
                // Игнорируем ошибки
            }
        });

        // Обнуляем массивы
        this.activeSources = [];
        this.gainNodes = [];
    }
}

// Для совместимости со старым кодом
const MelodyGenerator = NatureSoundsGenerator;
window.MelodyGenerator = NatureSoundsGenerator;
