import { intervalInSemitones, parseTetrachordsYaml } from "./logic.js";
import VexFlow from "vexflow";

const { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } = VexFlow;

const translations = {
  el: {
    "site.title": "Ελληνικές Λαϊκές Κλίμακες",
    "label.tetrachord": "Τετράχορδο",
    "label.pentachord": "Πεντάχορδο",
    "button.play": "▶︎",
    "aria.keys": "Πλήκτρα πιάνου από Ντο σε Ντο",
    "aria.staff": "Νότες στο πεντάγραμμο",
    "aria.intervals": "Διαστήματα",
    "aria.scale": "Επιλογή κλίμακας",
    "aria.mode": "Επιλογή είδους",
    "aria.language": "Επιλογή γλώσσας",
    "lang.el": "Ελληνικά",
    "lang.en": "English",
    "status.scales": "Αδυναμία φόρτωσης κλιμάκων"
  },
  en: {
    "site.title": "Greek Folk Scales",
    "label.tetrachord": "Tetrachord",
    "label.pentachord": "Pentachord",
    "button.play": "▶︎",
    "aria.keys": "Piano keys from C to C",
    "aria.staff": "Notes on the staff",
    "aria.intervals": "Intervals between notes",
    "aria.scale": "Select scale",
    "aria.mode": "Select type",
    "aria.language": "Select language",
    "lang.el": "Greek",
    "lang.en": "English",
    "status.scales": "Unable to load scales"
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
const select = document.getElementById("scaleSelect");
const modeButtons = Array.from(document.querySelectorAll(".mode-toggle button"));
const languageSelect = document.getElementById("languageSelect");
const statusMessage = document.getElementById("statusMessage");
const keyEls = Array.from(document.querySelectorAll(".white-key, .black-key"));
const keyLabels = Array.from(document.querySelectorAll(".key-label"));
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

const tempoBpm = 110;
const tempoMs = 60000 / tempoBpm;
let audioContext = null;
let masterGain = null;
let dryGain = null;
let wetGain = null;
let reverbNode = null;
let tetrachords = [];
let pentachords = [];
let currentNotes = [];
let currentLang = "el";
let currentMode = "tetrachord";
const sampleUrls = {
  C3: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/C3.mp3",
  F3: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/F3.mp3",
  A3: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/A3.mp3",
  C4: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/C4.mp3",
  F4: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/F4.mp3",
  A4: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/A4.mp3",
  C5: "https://cdn.jsdelivr.net/gh/gleitz/midi-js-soundfonts@master/FluidR3_GM/acoustic_grand_piano-mp3/C5.mp3"
};
const sampleFrequencies = {
  C3: 130.81,
  F3: 174.61,
  A3: 220.0,
  C4: 261.63,
  F4: 349.23,
  A4: 440.0,
  C5: 523.25
};
const sampleBuffers = new Map();
let sampleLoadPromise = null;

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
  if (languageSelect) {
    languageSelect.value = lang;
    Array.from(languageSelect.options).forEach((option) => {
      const labelKey = option.value === "el" ? "lang.el" : "lang.en";
      if (strings[labelKey]) {
        option.textContent = strings[labelKey];
      }
    });
  }
  if (statusMessage?.classList.contains("active")) {
    statusMessage.textContent = strings["status.scales"];
  }
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

function getCurrentScales() {
  return currentMode === "pentachord" ? pentachords : tetrachords;
}

function buildDropdown() {
  select.innerHTML = "";
  const scales = getCurrentScales();
  scales.forEach((scale, index) => {
    const option = document.createElement("option");
    option.value = index.toString();
    option.textContent = scale.name;
    select.appendChild(option);
  });
  const strings = translations[currentLang] || translations.el;
  select.setAttribute("aria-label", strings["aria.scale"] || "Select scale");
  select.disabled = scales.length === 0;
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
    return null;
  }
  staffWrapper.innerHTML = "";

  if (!notes || notes.length === 0) {
    return null;
  }

  const renderer = new Renderer(staffWrapper, Renderer.Backends.SVG);
  renderer.resize(760, 230);
  const context = renderer.getContext();

  const stave = new Stave(40, 40, 680);
  stave.addClef("treble");
  stave.setContext(context).draw();

  const staveNotes = createStaveNotes(notes);
  const mainVoice = new Voice({ numBeats: staveNotes.length, beatValue: 4 });
  mainVoice.setStave(stave);
  mainVoice.addTickables(staveNotes);

  new Formatter().joinVoices([mainVoice]).formatToStave([mainVoice], stave);
  mainVoice.draw(context, stave);

  renderIntervals(notes, { stave, mainVoice, context });

  context.setFillStyle("#111827");
  context.setStrokeStyle("#1f2933");

  const svg = staffWrapper.querySelector("svg");
  if (svg) {
    svg.setAttribute("aria-label", translations[currentLang]?.["aria.staff"] || "Notes on the staff");
  }

  return { stave, mainVoice, context };
}

function renderIntervals(notes, metrics) {
  if (!notes || notes.length < 2 || !metrics) {
    return;
  }
  const { mainVoice, context } = metrics;
  const tickables = mainVoice.getTickables();
  const labels = intervalLabelsByLang[currentLang] || intervalLabelsByLang.el;
  const intervalY = 190;
  const intervalYOffset = -36;
  const intervalXOffset = 90;
  context.save();
  context.setFont("14px Georgia, Times New Roman, serif", "");
  context.setFillStyle("#4b5563");
  tickables.slice(0, -1).forEach((tickable, index) => {
    const nextTickable = tickables[index + 1];
    const diff = intervalInSemitones(notes[index], notes[index + 1], enharmonicAliases);
    const tickContext = tickable?.getTickContext?.();
    const nextContext = nextTickable?.getTickContext?.();
    const tickableX = tickContext?.getX?.();
    const nextX = nextContext?.getX?.();
    if (diff == null || !Number.isFinite(tickableX) || !Number.isFinite(nextX)) {
      return;
    }
    const label = labels[diff] || `${diff}`;
    const midX = (tickableX + nextX) / 2 + intervalXOffset;
    context.fillText(label, midX - 6, intervalY + intervalYOffset);
  });
  context.restore();
}

function updatePentagram(notes) {
  renderStaff(notes);
}

function setLoadError(hasError) {
  if (!statusMessage) {
    return;
  }
  const strings = translations[currentLang] || translations.el;
  statusMessage.textContent = strings["status.scales"] || "Unable to load scales";
  statusMessage.classList.toggle("active", hasError);
  playButton.disabled = hasError;
  playButton.setAttribute("aria-disabled", hasError ? "true" : "false");
}

function updateSequence() {
  const scales = getCurrentScales();
  if (!scales.length) {
    currentNotes = [];
    setKeyHighlights(currentNotes);
    updatePentagram(currentNotes);
    return;
  }
  const selected = scales[Number(select.value)] || scales[0];
  if (!selected || !Array.isArray(selected.notes)) {
    return;
  }
  currentNotes = selected.notes.slice();
  setKeyHighlights(currentNotes);
  updatePentagram(currentNotes);
}

function playTone(freq, startTime, duration) {
  if (sampleBuffers.size > 0) {
    playSampleTone(freq, startTime, duration);
    return;
  }
  const oscPrimary = audioContext.createOscillator();
  const oscHarmonic = audioContext.createOscillator();
  const gain = audioContext.createGain();
  const filter = audioContext.createBiquadFilter();

  oscPrimary.type = "triangle";
  oscPrimary.frequency.value = freq;
  const detuneDrift = (Math.random() - 0.5) * 6;
  oscPrimary.detune.value = -6 + detuneDrift;

  oscHarmonic.type = "sine";
  oscHarmonic.frequency.value = freq * 2;
  oscHarmonic.detune.value = 3 + detuneDrift;

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(3000, freq * 4.6), startTime);
  filter.Q.setValueAtTime(0.65, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.6, startTime + 0.014);
  gain.gain.exponentialRampToValueAtTime(0.2, startTime + duration * 0.5);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  oscPrimary.connect(filter);
  oscHarmonic.connect(filter);
  filter.connect(gain);
  gain.connect(dryGain);
  gain.connect(wetGain);

  oscPrimary.start(startTime);
  oscHarmonic.start(startTime);
  const stopTime = startTime + duration + 0.14;
  oscPrimary.stop(stopTime);
  oscHarmonic.stop(stopTime);
}

function playSampleTone(freq, startTime, duration) {
  const sampleKey = pickSampleKey(freq);
  const buffer = sampleBuffers.get(sampleKey);
  if (!buffer) {
    return;
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  source.playbackRate.value = freq / sampleFrequencies[sampleKey];

  filter.type = "lowpass";
  filter.frequency.setValueAtTime(Math.min(2500, freq * 3.6), startTime);
  filter.Q.setValueAtTime(0.45, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(0.85, startTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.4, startTime + duration * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.08);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(dryGain);
  gain.connect(wetGain);
  source.start(startTime);
  source.stop(startTime + duration + 0.35);
}

function pickSampleKey(freq) {
  let closestKey = "C4";
  let closestDiff = Infinity;
  Object.entries(sampleFrequencies).forEach(([key, sampleFreq]) => {
    const diff = Math.abs(freq - sampleFreq);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestKey = key;
    }
  });
  return closestKey;
}

async function loadSamples() {
  if (sampleLoadPromise) {
    return sampleLoadPromise;
  }
  sampleLoadPromise = Promise.all(
    Object.entries(sampleUrls).map(async ([key, url]) => {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      sampleBuffers.set(key, buffer);
    })
  ).catch((error) => {
    console.warn("Sample loading failed, using synth fallback.", error);
  });
  return sampleLoadPromise;
}

function buildReverbImpulse(context, duration, decay) {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const impulse = context.createBuffer(2, length, sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, decay);
    }
  }
  return impulse;
}

async function playSequence() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (!masterGain) {
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.9;

    dryGain = audioContext.createGain();
    dryGain.gain.value = 0.72;

    wetGain = audioContext.createGain();
    wetGain.gain.value = 0.38;

    reverbNode = audioContext.createConvolver();
    reverbNode.buffer = buildReverbImpulse(audioContext, 1.9, 2.8);

    dryGain.connect(masterGain);
    wetGain.connect(reverbNode);
    reverbNode.connect(masterGain);
    masterGain.connect(audioContext.destination);
  }
  await loadSamples();
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
  try {
    const response = await fetch("tetrachords.yml");
    if (!response.ok) {
      throw new Error(`Failed to load tetrachords: ${response.status}`);
    }
    const text = await response.text();
    tetrachords = parseTetrachordsYaml(text);
  } catch (error) {
    console.warn("Tetrachords load failed", error);
    tetrachords = [];
  }
}

async function loadPentachords() {
  try {
    const response = await fetch("pentachords.yml");
    if (!response.ok) {
      throw new Error(`Failed to load pentachords: ${response.status}`);
    }
    const text = await response.text();
    pentachords = parseTetrachordsYaml(text);
  } catch (error) {
    console.warn("Pentachords load failed", error);
    pentachords = [];
  }
}

async function loadScales() {
  await Promise.all([loadTetrachords(), loadPentachords()]);
  buildDropdown();
  if (!tetrachords.length && !pentachords.length) {
    setLoadError(true);
    updateSequence();
    return;
  }
  if (currentMode === "pentachord" && !pentachords.length) {
    currentMode = "tetrachord";
  }
  if (currentMode === "tetrachord" && !tetrachords.length) {
    currentMode = "pentachord";
  }
  modeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === currentMode);
  });
  select.value = "0";
  updateSequence();
  const activeScales = getCurrentScales();
  setLoadError(activeScales.length === 0);
}

select.addEventListener("change", updateSequence);

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const nextMode = button.dataset.mode;
    if (!nextMode || nextMode === currentMode) {
      return;
    }
    currentMode = nextMode;
    modeButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.mode === currentMode);
    });
    buildDropdown();
    select.value = "0";
    updateSequence();
    const activeScales = getCurrentScales();
    setLoadError(activeScales.length === 0);
  });
});

languageSelect?.addEventListener("change", () => {
  setLanguage(languageSelect.value);
});

playButton.addEventListener("click", async () => {
  playButton.classList.add("hidden");
  const length = await playSequence();
  setTimeout(() => {
    playButton.classList.remove("hidden");
  }, tempoMs * length);
});


currentLang = detectLanguage();
applyTranslations(currentLang);
loadScales();
