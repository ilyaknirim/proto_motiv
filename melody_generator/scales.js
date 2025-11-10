
/**
 * Модуль определения музыкальных гамм и аккордов
 */

class Scales {
    constructor() {
        // Частоты нот в Гц (4-я октава)
        this.noteFrequencies = {
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

        // Определения гамм
        this.scales = {
            // Мажорная гамма (бодрая, позитивная)
            'C major': {
                notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
                mood: 'happy'
            },
            'G major': {
                notes: ['G', 'A', 'B', 'C', 'D', 'E', 'F#'],
                mood: 'happy'
            },
            'D major': {
                notes: ['D', 'E', 'F#', 'G', 'A', 'B', 'C#'],
                mood: 'energetic'
            },

            // Минорные гаммы (спокойные, задумчивые)
            'A minor': {
                notes: ['A', 'B', 'C', 'D', 'E', 'F', 'G'],
                mood: 'calm'
            },
            'E minor': {
                notes: ['E', 'F#', 'G', 'A', 'B', 'C', 'D'],
                mood: 'calm'
            },
            'D minor': {
                notes: ['D', 'E', 'F', 'G', 'A', 'A#', 'C'],
                mood: 'calm'
            },

            // Пентатоника (успокаивающая)
            'C pentatonic': {
                notes: ['C', 'D', 'E', 'G', 'A'],
                mood: 'calm'
            },
            'G pentatonic': {
                notes: ['G', 'A', 'B', 'D', 'E'],
                mood: 'calm'
            }
        };

        // Определения аккордов
        this.chords = {
            // Мажорные аккорды
            'C major': ['C', 'E', 'G'],
            'G major': ['G', 'B', 'D'],
            'D major': ['D', 'F#', 'A'],
            'A major': ['A', 'C#', 'E'],
            'F major': ['F', 'A', 'C'],

            // Минорные аккорды
            'A minor': ['A', 'C', 'E'],
            'E minor': ['E', 'G', 'B'],
            'D minor': ['D', 'F', 'A'],

            // Септ-аккорды
            'C major 7': ['C', 'E', 'G', 'B'],
            'G major 7': ['G', 'B', 'D', 'F#'],
            'A minor 7': ['A', 'C', 'E', 'G'],
            'D minor 7': ['D', 'F', 'A', 'C']
        };
    }

    /**
     * Получает гамму по настроению
     * @param {string} mood - настроение ('calm', 'energetic', 'happy')
     * @returns {Object} объект гаммы
     */
    getScaleByMood(mood) {
        const matchingScales = Object.entries(this.scales)
            .filter(([name, scale]) => scale.mood === mood)
            .map(([name, scale]) => ({ name, ...scale }));

        // Если нет подходящих гамм, используем гамму по умолчанию
        if (matchingScales.length === 0) {
            return { name: 'C major', notes: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], mood: 'happy' };
        }

        // Выбираем случайную гамму из подходящих
        const randomIndex = Math.floor(Math.random() * matchingScales.length);
        return matchingScales[randomIndex];
    }

    /**
     * Получает частоту ноты
     * @param {string} note - нота (например, 'C', 'D#')
     * @param {number} octave - октава (по умолчанию 4)
     * @returns {number} частота в Гц
     */
    getNoteFrequency(note, octave = 4) {
        const baseFreq = this.noteFrequencies[note];
        if (!baseFreq) {
            console.error(`Неизвестная нота: ${note}`);
            return 440; // A4 по умолчанию
        }

        // Корректируем частоту в зависимости от октавы
        return baseFreq * Math.pow(2, octave - 4);
    }

    /**
     * Получает аккорд по названию
     * @param {string} chordName - название аккорда
     * @returns {Object} объект аккорда с нотами и их частотами
     */
    getChord(chordName) {
        const chordNotes = this.chords[chordName];
        if (!chordNotes) {
            console.error(`Неизвестный аккорд: ${chordName}`);
            return { name: chordName, notes: [], frequencies: [] };
        }

        return {
            name: chordName,
            notes: chordNotes,
            frequencies: chordNotes.map(note => this.getNoteFrequency(note))
        };
    }

    /**
     * Получает случайный аккорд из гаммы
     * @param {Object} scale - объект гаммы
     * @param {string} type - тип аккорда ('major', 'minor', '7')
     * @returns {Object} объект аккорда
     */
    getRandomChordFromScale(scale, type = 'major') {
        const scaleNotes = scale.notes;
        const rootNoteIndex = Math.floor(Math.random() * scaleNotes.length);
        const rootNote = scaleNotes[rootNoteIndex];

        // Определяем тип аккорда на основе настроения
        let chordType = type;
        if (scale.mood === 'calm' && Math.random() > 0.5) {
            chordType = 'minor';
        }

        // Генерируем название аккорда
        const chordName = `${rootNote} ${chordType}`;

        // Получаем аккорд
        return this.getChord(chordName);
    }
}
