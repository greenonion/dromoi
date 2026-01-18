import { intervalInSemitones, parseTetrachordsYaml } from "./logic.js";
import VexFlow from "vexflow";

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VexFlow;

const translations = {
  el: {
    "site.title": "Ελληνικές Λαϊκές Κλίμακες",
    "label.tetrachord": "Τετράχορδο",
    "button.play": "▶︎",
    "aria.keys": "Πλήκτρα πιάνου από Ντο σε Ντο",
    "aria.staff": "Νότες στο πεντάγραμμο",
    "aria.tetrachord": "Επιλογή τετραχόρδου",
    "aria.language": "Επιλογή γλώσσας",
    "lang.el": "Ελληνικά",
    "lang.en": "English"
  },
  en: {
    "site.title": "Greek Folk Scales",
    "label.tetrachord": "Tetrachord",
    "button.play": "▶︎",
    "aria.keys": "Piano keys from C to C",
    "aria.staff": "Notes on the staff",
    "aria.tetrachord": "Select tetrachord",
    "aria.language": "Language picker",
    "lang.el": "Greek",
    "lang.en": "English"
  }
};

const intervalLabelsByLang = {
  el: {
    1: "Η",
    2: "T",
    3: "Τρ"
  },
  en: {
    1: "S",
    2: "T",
    3: "m3"
  }
};

const playButton = document.getElementById("playButton");
const select = document.getElementById("tetrachordSelect");
const keyEls = Array.from(document.querySelectorAll(".white-key, .black-key"));
const intervalLabels = Array.from(document.querySelectorAll(".interval-label"));
const keyLabels = Array.from(document.querySelectorAll(".key-label"));
const langButtons = Array.from(document.querySelectorAll(".lang-switcher button"));
const i18nElements = Array.from(document.querySelectorAll("[data-i18n]"));
const i18nAttrElements = Array.from(document.querySelectorAll("[data-i18n-attr]"));
const staffWrapper = document.getElementById("staff");

const baseFrequencies = {
  C: 261.63,
  Db: 277.18,
  D: 293.66,
  Eb: 311.13,
  E: 329.63,
  F: 349.23,
  Gb: 369.99,
  G: 392.0,
  Ab: 415.3,
  A: 440.0,
  Bb: 466.16,
  B: 493.88,
  C5: 523.25
};

const enharmonicAliases = {
  "F#": "Gb",
  "E#": "F"
};

const noteLabels = {
  C: "C",
  Db: "D♭",
  D: "D",
  Eb: "E♭",
  E: "E",
  F: "F",
  "F#": "F♯",
  Gb: "G♭",
  G: "G",
  Ab: "A♭",
  A: "A",
  Bb: "B♭",
  B: "B",
  "E#": "E♯",
  C5: "C"
};

const accidentals = {
  Db: "b",
  Eb: "b",
  Gb: "b",
  Ab: "b",
  Bb: "b",
  "F#": "#",
  "E#": "#"
};

const tempoMs = 700;
let audioContext = null;
let tetrachords = [];
let currentNotes = [];
let currentLang = "el";

function applyTranslations(lang) {
  const strings = translations[lang] || translations.el;
  i18nElements.forEach((el) => {
    const key = el.dataset.i18n;
    if (strings[key]) {
      el.textContent = strings[key];
    }
  });
  i18nAttrElements.forEach((el) => {
    const mappings = el.dataset.i18nAttr.split(";");
    mappings.forEach((mapping) => {
      const [attr, key] = mapping.split(":");
      if (strings[key]) {
        el.setAttribute(attr, strings[key]);
      }
    });
  });
  langButtons.forEach((button) => {
    const isActive = button.dataset.lang === lang;
    button.classList.toggle("active", isActive);
    const labelKey = button.dataset.lang === "el" ? "lang.el" : "lang.en";
    if (strings[labelKey]) {
      button.textContent = strings[labelKey];
    }
  });
  document.documentElement.lang = lang;
  if (strings["site.title"]) {
    document.title = strings["site.title"];
  }
}

function setLanguage(lang) {
  currentLang = translations[lang] ? lang : "el";
  localStorage.setItem("lang", currentLang);
  applyTranslations(currentLang);
  buildDropdown();
  updatePentagram(currentNotes);
}

function detectLanguage() {
  const stored = localStorage.getItem("lang");
  if (stored && translations[stored]) {
    return stored;
  }
  return "el";
}

function buildDropdown() {
  select.innerHTML = "";
  tetrachords.forEach((tet, index) => {
    const option = document.createElement("option");
    option.value = index.toString();
    option.textContent = tet.name;
    select.appendChild(option);
  });
  const strings = translations[currentLang] || translations.el;
  select.setAttribute("aria-label", strings["aria.tetrachord"] || "Select tetrachord");
}

function setKeyHighlights(notes) {
  keyEls.forEach((key) => {
    const keyNote = key.dataset.note;
    const shouldHighlight = notes.some((note) => {
      const normalized = enharmonicAliases[note] || note;
      return normalized === keyNote || (keyNote === "C5" && normalized === "C");
    });
    key.classList.toggle("blue", shouldHighlight);
  });

  keyLabels.forEach((label) => {
    const labelNote = label.textContent.trim();
    const shouldShow = notes.some((note) => {
      const normalized = enharmonicAliases[note] || note;
      return normalized === labelNote || noteLabels[normalized] === labelNote;
    });
    label.classList.toggle("active", shouldShow);
  });
}

function toVexKey(note) {
  if (note === "C5") {
    return "c/5";
  }
  const match = note.match(/^([A-G])([b#]?)/);
  if (!match) {
    return "c/4";
  }
  const letter = match[1].toLowerCase();
  const accidental = match[2] || "";
  return `${letter}${accidental}/4`;
}

function createStaveNotes(notes) {
  return notes.map((note) => {
    const key = toVexKey(note);
    const vexNote = new StaveNote({
      keys: [key],
      duration: "q"
    });
    const accidental = accidentals[note];
    if (accidental) {
      vexNote.addModifier(new Accidental(accidental));
    }
    vexNote.setStyle({ fillStyle: "#111827", strokeStyle: "#111827" });
    vexNote.setStemStyle({ strokeStyle: "#111827", lineWidth: 2.2 });
    return vexNote;
  });
}

function renderStaff(notes) {
  if (!staffWrapper) {
    return;
  }
  staffWrapper.innerHTML = "";

  const renderer = new Renderer(staffWrapper, Renderer.Backends.SVG);
  renderer.resize(760, 190);
  const context = renderer.getContext();

  const stave = new Stave(40, 40, 680);
  stave.addClef("treble");
  stave.setContext(context).draw();

  const staveNotes = createStaveNotes(notes);
  const voice = new Voice({ num_beats: staveNotes.length, beat_value: 4 });
  voice.addTickables(staveNotes);

  new Formatter().joinVoices([voice]).format([voice], 440);
  voice.draw(context, stave);

  context.setFillStyle("#111827");
  context.setStrokeStyle("#1f2933");

  const svg = staffWrapper.querySelector("svg");
  if (svg) {
    svg.setAttribute("aria-label", translations[currentLang]?.["aria.staff"] || "Notes on the staff");
  }

}

function updatePentagram(notes) {
  renderStaff(notes);

  const intervalMap = intervalLabelsByLang[currentLang] || intervalLabelsByLang.el;
  intervalLabels.forEach((label, index) => {
    const start = notes[index];
    const end = notes[index + 1];
    const interval = intervalInSemitones(start, end, enharmonicAliases);
    if (!interval) {
      label.textContent = "";
      return;
    }
    label.textContent = intervalMap[interval] || "";
  });
}

function updateSequence() {
  const selected = tetrachords[Number(select.value)] || tetrachords[0];
  currentNotes = selected.notes.slice();
  setKeyHighlights(currentNotes);
  updatePentagram(currentNotes);
}

function playTone(freq, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.05);
}

function playSequence() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  const noteSequence = [...currentNotes, ...currentNotes.slice(0, -1).reverse()];
  const now = audioContext.currentTime + 0.05;
  noteSequence.forEach((note, index) => {
    const baseNote = enharmonicAliases[note] || note;
    const freq = baseFrequencies[baseNote];
    if (!freq) {
      return;
    }
    playTone(freq, now + (tempoMs / 1000) * index, (tempoMs / 1000) * 0.8);
  });
  return noteSequence.length;
}

async function loadTetrachords() {
  const response = await fetch("tetrachords.yml");
  const text = await response.text();
  tetrachords = parseTetrachordsYaml(text);
  buildDropdown();
  select.value = "0";
  updateSequence();
}

select.addEventListener("change", updateSequence);

langButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLanguage(button.dataset.lang);
  });
});

playButton.addEventListener("click", () => {
  playButton.classList.add("hidden");
  const length = playSequence();
  setTimeout(() => {
    playButton.classList.remove("hidden");
  }, tempoMs * length);
});

currentLang = detectLanguage();
applyTranslations(currentLang);
loadTetrachords();
