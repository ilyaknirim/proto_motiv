
/**
 * Модуль паттернов для генерации мелодий
 */

class Patterns {
    constructor() {
        // Паттерны для мелодии
        this.melodyPatterns = {
            // Восходящий паттерн
            'ascending': {
                name: 'Восходящий',
                generate: (scale) => {
                    const notes = [];
                    for (let i = 0; i < scale.notes.length; i++) {
                        notes.push({
                            pitch: scale.notes[i],
                            octave: 4 + Math.floor(i / 7),
                            duration: 0.5
                        });
                    }
                    return notes;
                }
            },

            // Нисходящий паттерн
            'descending': {
                name: 'Нисходящий',
                generate: (scale) => {
                    const notes = [];
                    for (let i = scale.notes.length - 1; i >= 0; i--) {
                        notes.push({
                            pitch: scale.notes[i],
                            octave: 4 + Math.floor(i / 7),
                            duration: 0.5
                        });
                    }
                    return notes;
                }
            },

            // Волновой паттерн
            'wave': {
                name: 'Волновой',
                generate: (scale) => {
                    const notes = [];
                    const midPoint = Math.floor(scale.notes.length / 2);

                    // Вверх
                    for (let i = 0; i <= midPoint; i++) {
                        notes.push({
                            pitch: scale.notes[i],
                            octave: 4,
                            duration: 0.5
                        });
                    }

                    // Вниз
                    for (let i = midPoint - 1; i >= 0; i--) {
                        notes.push({
                            pitch: scale.notes[i],
                            octave: 4,
                            duration: 0.5
                        });
                    }

                    return notes;
                }
            },

            // Случайный паттерн
            'random': {
                name: 'Случайный',
                generate: (scale) => {
                    const notes = [];
                    const length = 8 + Math.floor(Math.random() * 8); // 8-16 нот

                    for (let i = 0; i < length; i++) {
                        const noteIndex = Math.floor(Math.random() * scale.notes.length);
                        notes.push({
                            pitch: scale.notes[noteIndex],
                            octave: 4 + Math.floor(Math.random() * 2), // 4-я или 5-я октава
                            duration: 0.25 + Math.random() * 0.5 // 0.25-0.75 секунды
                        });
                    }

                    return notes;
                }
            }
        };

        // Паттерны для гармонии (аккорды)
        this.harmonyPatterns = {
            // Прогрессия I-V-vi-IV (самая популярная в поп-музыке)
            'pop': {
                name: 'Поп-прогрессия',
                generate: (scale) => {
                    const chords = [];
                    const scaleNotes = scale.notes;

                    // Определяем ноты для аккордов
                    const tonic = scaleNotes[0]; // I
                    const dominant = scaleNotes[4] || scaleNotes[3]; // V
                    const submediant = scaleNotes[5] || scaleNotes[4]; // vi
                    const subdominant = scaleNotes[3] || scaleNotes[2]; // IV

                    // Создаем аккорды
                    chords.push(
                        { notes: [tonic, scaleNotes[2] || scaleNotes[1], scaleNotes[4] || scaleNotes[3]] }, // I
                        { notes: [dominant, scaleNotes[6] || scaleNotes[5], scaleNotes[1] || scaleNotes[0]] }, // V
                        { notes: [submediant, scaleNotes[0], scaleNotes[2] || scaleNotes[1]] }, // vi
                        { notes: [subdominant, scaleNotes[2] || scaleNotes[1], scaleNotes[4] || scaleNotes[3]] } // IV
                    );

                    return chords;
                }
            },

            // Простая прогрессия I-IV-V-I
            'simple': {
                name: 'Простая прогрессия',
                generate: (scale) => {
                    const chords = [];
                    const scaleNotes = scale.notes;

                    // Определяем ноты для аккордов
                    const tonic = scaleNotes[0]; // I
                    const subdominant = scaleNotes[3] || scaleNotes[2]; // IV
                    const dominant = scaleNotes[4] || scaleNotes[3]; // V

                    // Создаем аккорды
                    chords.push(
                        { notes: [tonic, scaleNotes[2] || scaleNotes[1], scaleNotes[4] || scaleNotes[3]] }, // I
                        { notes: [subdominant, scaleNotes[2] || scaleNotes[1], scaleNotes[4] || scaleNotes[3]] }, // IV
                        { notes: [dominant, scaleNotes[6] || scaleNotes[5], scaleNotes[1] || scaleNotes[0]] }, // V
                        { notes: [tonic, scaleNotes[2] || scaleNotes[1], scaleNotes[4] || scaleNotes[3]] } // I
                    );

                    return chords;
                }
            },

            // Случайная прогрессия
            'random': {
                name: 'Случайная прогрессия',
                generate: (scale) => {
                    const chords = [];
                    const scaleNotes = scale.notes;
                    const numChords = 4;

                    for (let i = 0; i < numChords; i++) {
                        // Выбираем случайную ноту как основу аккорда
                        const rootIndex = Math.floor(Math.random() * scaleNotes.length);
                        const root = scaleNotes[rootIndex];

                        // Добавляем третью и пятую ступени
                        const third = scaleNotes[(rootIndex + 2) % scaleNotes.length];
                        const fifth = scaleNotes[(rootIndex + 4) % scaleNotes.length];

                        chords.push({ notes: [root, third, fifth] });
                    }

                    return chords;
                }
            }
        };

        // Паттерны для баса
        this.bassPatterns = {
            // Простая басовая линия (корневые ноты аккордов)
            'simple': {
                name: 'Простая басовая линия',
                generate: (scale, harmony) => {
                    const bass = [];

                    harmony.forEach(chord => {
                        const rootNote = chord.notes[0];
                        bass.push({
                            pitch: rootNote,
                            octave: 3, // Бас играет на октаву ниже
                            duration: 1
                        });
                    });

                    return bass;
                }
            },

            // Арпеджио
            'arpeggio': {
                name: 'Арпеджио',
                generate: (scale, harmony) => {
                    const bass = [];

                    harmony.forEach(chord => {
                        chord.notes.forEach(note => {
                            bass.push({
                                pitch: note,
                                octave: 3,
                                duration: 0.25
                            });
                        });
                    });

                    return bass;
                }
            },

            // Ритмичный паттерн
            'rhythmic': {
                name: 'Ритмичный паттерн',
                generate: (scale, harmony) => {
                    const bass = [];

                    harmony.forEach(chord => {
                        const rootNote = chord.notes[0];

                        // Создаем ритмичный паттерн
                        bass.push({
                            pitch: rootNote,
                            octave: 3,
                            duration: 0.75
                        });

                        bass.push({
                            pitch: rootNote,
                            octave: 3,
                            duration: 0.25
                        });

                        bass.push({
                            pitch: rootNote,
                            octave: 3,
                            duration: 0.5
                        });

                        bass.push({
                            pitch: rootNote,
                            octave: 3,
                            duration: 0.5
                        });
                    });

                    return bass;
                }
            }
        };
    }

    /**
     * Генерирует паттерн мелодии
     * @param {Object} scale - объект гаммы
     * @param {Object} options - опции генерации
     * @returns {Object} паттерн мелодии
     */
    generateMelodyPattern(scale, options) {
        const mood = options.mood || 'calm';

        // Выбираем паттерны в зависимости от настроения
        let melodyPatternType, harmonyPatternType, bassPatternType;

        if (mood === 'happy') {
            melodyPatternType = Math.random() > 0.5 ? 'ascending' : 'wave';
            harmonyPatternType = 'pop';
            bassPatternType = 'simple';
        } else if (mood === 'energetic') {
            melodyPatternType = 'random';
            harmonyPatternType = 'simple';
            bassPatternType = 'rhythmic';
        } else { // calm, gentle, peaceful
            // Для спокойных мелодий используем более мягкие паттерны
            const calmPatterns = ['wave', 'descending', 'gentle_flow', 'soft_arpeggio'];
            melodyPatternType = calmPatterns[Math.floor(Math.random() * calmPatterns.length)];
            harmonyPatternType = Math.random() > 0.6 ? 'simple' : 'random';
            bassPatternType = Math.random() > 0.7 ? 'simple' : 'arpeggio';
        }

        // Генерируем паттерны
        const melody = this.melodyPatterns[melodyPatternType] ?
            this.melodyPatterns[melodyPatternType].generate(scale) :
            this.generateGentleFlowPattern(scale); // Fallback для новых паттернов

        const harmony = this.harmonyPatterns[harmonyPatternType].generate(scale);
        const bass = this.bassPatterns[bassPatternType].generate(scale, harmony);

        return {
            melody: melody,
            harmony: harmony,
            bass: bass
        };
    }

    /**
     * Генерирует мягкий, текучий паттерн для спокойных мелодий
     * @param {Object} scale - объект гаммы
     * @returns {Array} массив нот паттерна
     */
    generateGentleFlowPattern(scale) {
        const notes = [];
        const scaleNotes = scale.notes;
        const length = 12 + Math.floor(Math.random() * 12); // 12-24 ноты

        // Создаем плавную мелодию с небольшими интервалами
        let currentIndex = Math.floor(Math.random() * 3); // Начинаем с нижней части гаммы

        for (let i = 0; i < length; i++) {
            // Выбираем следующую ноту с предпочтением к небольшим интервалам
            const direction = Math.random() > 0.6 ? 1 : -1; // 60% вверх, 40% вниз
            const step = Math.random() > 0.7 ? 2 : 1; // 70% на ступень, 30% через ступень

            currentIndex = Math.max(0, Math.min(scaleNotes.length - 1, currentIndex + (direction * step)));

            const octave = 4 + Math.floor(currentIndex / 7);
            const duration = 0.4 + Math.random() * 0.4; // 0.4-0.8 секунды

            notes.push({
                pitch: scaleNotes[currentIndex],
                octave: octave,
                duration: duration
            });
        }

        return notes;
    }

    /**
     * Генерирует мягкий арпеджио паттерн
     * @param {Object} scale - объект гаммы
     * @returns {Array} массив нот паттерна
     */
    generateSoftArpeggioPattern(scale) {
        const notes = [];
        const scaleNotes = scale.notes;
        const length = 16; // Фиксированная длина для арпеджио

        // Создаем арпеджио из 4 нот гаммы
        const baseNotes = scaleNotes.slice(0, 4);

        for (let cycle = 0; cycle < 4; cycle++) {
            // Вверх
            for (let i = 0; i < baseNotes.length; i++) {
                notes.push({
                    pitch: baseNotes[i],
                    octave: 4,
                    duration: 0.3
                });
            }

            // Вниз (с небольшим изменением)
            for (let i = baseNotes.length - 2; i >= 0; i--) {
                notes.push({
                    pitch: baseNotes[i],
                    octave: 4,
                    duration: 0.3
                });
            }
        }

        return notes;
    }
}
