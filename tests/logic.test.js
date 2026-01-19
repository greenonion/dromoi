import { describe, expect, test, beforeEach } from "bun:test";
import {
  buildNotesFromIntervals,
  intervalInSemitones,
  parseIntervalsYaml,
  parseScaleCombosYaml
} from "../logic.js";
import { Window } from "happy-dom";

function setupDom() {
  const window = new Window();
  const document = window.document;
  const body = document.body;
  const originalCreateElement = document.createElement.bind(document);
  document.createElement = (tagName, options) => {
    const element = originalCreateElement(tagName, options);
    if (tagName === "canvas") {
      element.getContext = () => ({
        measureText: () => ({ width: 10 }),
        fillText() {},
        save() {},
        restore() {},
        scale() {},
        translate() {},
        beginPath() {},
        rect() {},
        fill() {},
        stroke() {},
        moveTo() {},
        lineTo() {},
        closePath() {},
        setLineDash() {},
        arc() {}
      });
    }
    return element;
  };
  body.innerHTML = `
    <div class="lang-switcher">
      <select id="languageSelect" aria-label="Select language">
        <option value="el">Ελληνικά</option>
        <option value="en">English</option>
      </select>
    </div>
    <div class="selector">
    <div class="mode-toggle" role="group" aria-label="Επιλογή είδους">
      <button type="button" class="active" data-mode="tetrachord">Τετράχορδο</button>
      <button type="button" data-mode="pentachord">Πεντάχορδο</button>
      <button type="button" data-mode="scale">Κλίμακα</button>
    </div>

      <select id="scaleSelect" aria-label="Επιλογή κλίμακας"></select>
    </div>
    <div id="statusMessage" class="status-message" role="status" aria-live="polite"></div>
    <button class="play-button" id="playButton" type="button">▶︎</button>
    <div class="keys-frame">
      <svg width="810" height="120" viewBox="0 0 810 120">
        <rect class="white-key" data-note="C" x="0" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="D" x="90" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="E" x="180" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="F" x="270" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="G" x="360" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="A" x="450" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="B" x="540" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="C5" x="630" y="0" width="90" height="120" rx="10"></rect>
        <rect class="white-key" data-note="D5" x="720" y="0" width="90" height="120" rx="10"></rect>
        <rect class="black-key" data-note="C#" x="62" y="0" width="56" height="70" rx="6"></rect>
        <rect class="black-key" data-note="D#" x="152" y="0" width="56" height="70" rx="6"></rect>
        <rect class="black-key" data-note="F#" x="332" y="0" width="56" height="70" rx="6"></rect>
        <rect class="black-key" data-note="G#" x="422" y="0" width="56" height="70" rx="6"></rect>
        <rect class="black-key" data-note="A#" x="512" y="0" width="56" height="70" rx="6"></rect>
        <rect class="black-key" data-note="C#5" x="692" y="0" width="56" height="70" rx="6"></rect>
        <text class="key-label" x="38" y="102">C</text>
        <text class="key-label" x="128" y="102">D</text>
        <text class="key-label" x="218" y="102">E</text>
        <text class="key-label" x="308" y="102">F</text>
        <text class="key-label" x="398" y="102">G</text>
        <text class="key-label" x="488" y="102">A</text>
        <text class="key-label" x="578" y="102">B</text>
        <text class="key-label" x="668" y="102">C</text>
        <text class="key-label" x="758" y="102">D</text>
        <text class="key-label black" x="90" y="52">C♯</text>
        <text class="key-label black" x="180" y="52">D♯</text>
        <text class="key-label black" x="360" y="52">F♯</text>
        <text class="key-label black" x="450" y="52">G♯</text>
        <text class="key-label black" x="540" y="52">A♯</text>
        <text class="key-label black" x="720" y="52">C♯</text>
      </svg>
    </div>
    <div id="staff" class="staff"></div>
  `;
    window.fetch = (url) => {
      if (url.includes("tetrachords.yml")) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve("- name: Ράστ\n  intervals: [2, 2, 1]\n") });
      }
      if (url.includes("pentachords.yml")) {
        return Promise.resolve({ ok: true, text: () => Promise.resolve("- name: Ράστ\n  intervals: [2, 2, 1, 2]\n") });
      }
      if (url.includes("scales.yml")) {
        return Promise.resolve({
          ok: true,
          text: () =>
            Promise.resolve(
              "- name: Major\n  first:\n    name: Ράστ\n    type: pentachord\n  second:\n    name: Ράστ\n    type: tetrachord\n"
            )
        });
      }
      if (url.includes("acoustic_grand_piano")) {
        return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) });
      }
      return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve("") });
    };
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 0;
    };

  Object.defineProperty(window, "localStorage", {
    value: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    configurable: true
  });
  window.AudioContext = class {
    constructor() {
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
    }
    createOscillator() {
      return { frequency: { value: 0 }, detune: { value: 0 }, connect() {}, start() {}, stop() {}, type: "sine" };
    }
    createBiquadFilter() {
      return { frequency: { setValueAtTime() {} }, Q: { setValueAtTime() {} }, connect() {}, type: "lowpass" };
    }
    createConvolver() {
      return { buffer: null, connect() {} };
    }
    createBuffer(channels, length) {
      return { numberOfChannels: channels, getChannelData: () => new Float32Array(length) };
    }
    createBufferSource() {
      return { buffer: null, playbackRate: { value: 1 }, connect() {}, start() {}, stop() {} };
    }
    decodeAudioData() {
      return Promise.resolve({});
    }
  };
  window.webkitAudioContext = window.AudioContext;
  return window;
}

describe("parseIntervalsYaml", () => {
  test("parses intervals", () => {
    const yamlText = `- name: Ράστ
  intervals: [2, 2, 1]
- name: Ουσάκ
  intervals: [1, 2, 2]
`;
    const parsed = parseIntervalsYaml(yamlText);
    expect(parsed.length).toBe(2);
    expect(parsed[0]?.name).toBe("Ράστ");
    expect(parsed[1]?.intervals?.join(",")).toBe("1,2,2");
  });
});

describe("intervalInSemitones", () => {
  test("returns expected intervals", () => {
    expect(intervalInSemitones("C", "D")).toBe(2);
    expect(intervalInSemitones("D", "Eb")).toBe(1);
    expect(intervalInSemitones("D", "F")).toBe(3);
    expect(intervalInSemitones("B", "C")).toBe(1);
  });
});

describe("buildNotesFromIntervals", () => {
  test("builds ascending D major scale", () => {
    const pentachord = [2, 2, 1, 2];
    const tetrachord = [2, 2, 1];
    const firstNotes = buildNotesFromIntervals(pentachord, "D", { "F#": "F#" });
    const secondNotes = buildNotesFromIntervals(tetrachord, "A", { "F#": "F#" });
    const combined = [...firstNotes, ...secondNotes.slice(1)];
    expect(combined.join(",")).toBe("D,E,F#,G,A,B,C#5,D5");
  });
});

describe("parseScaleCombosYaml", () => {
  test("parses scale combos", () => {
    const yamlText = `- name: Major
  first:
    name: Ράστ
    type: pentachord
  second:
    name: Ράστ
    type: tetrachord
`;
    const parsed = parseScaleCombosYaml(yamlText);
    expect(parsed.length).toBe(1);
    expect(parsed[0]?.name).toBe("Major");
    expect(parsed[0]?.first?.name).toBe("Ράστ");
    expect(parsed[0]?.second?.type).toBe("tetrachord");
  });
});

describe("staff rendering", () => {
  beforeEach(async () => {
    const window = setupDom();
    globalThis.window = window;
    globalThis.document = window.document;
    globalThis.navigator = window.navigator;
    globalThis.fetch = window.fetch;
    globalThis.localStorage = window.localStorage;
    globalThis.AudioContext = window.AudioContext;
    globalThis.webkitAudioContext = window.webkitAudioContext;
    await import(`../app.js?cache=${Date.now()}`);
  });

  async function waitForOptions() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      if (document.querySelectorAll("#scaleSelect option").length > 0) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }

  test("renders staff notes for pentachord selection", async () => {
    await waitForOptions();
    const pentachordButton = document.querySelector('[data-mode="pentachord"]');
    pentachordButton.click();

    await Promise.resolve();

    const staffSvg = document.querySelector("#staff svg");
    expect(staffSvg).not.toBeNull();
    const stavenotes = staffSvg.querySelectorAll("g.vf-stavenote");
    const noteheads = staffSvg.querySelectorAll("g.vf-notehead");
    if (stavenotes.length === 0 && noteheads.length === 0) {
      throw new Error(`No notes rendered. SVG: ${staffSvg.outerHTML}`);
    }
    expect(noteheads.length || stavenotes.length).toBe(5);
  });

  test("renders staff notes for scale selection", async () => {
    await waitForOptions();
    const scaleButton = document.querySelector('[data-mode="scale"]');
    scaleButton.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const staffSvg = document.querySelector("#staff svg");
    expect(staffSvg).not.toBeNull();
    const stavenotes = staffSvg.querySelectorAll("g.vf-stavenote");
    const noteheads = staffSvg.querySelectorAll("g.vf-notehead");
    if (stavenotes.length === 0 && noteheads.length === 0) {
      throw new Error(`No notes rendered. SVG: ${staffSvg.outerHTML}`);
    }
    expect(window.__currentNotes.join(",")).toBe("D,E,F#,G,A,B,C#5,D5");
    const activeKeys = Array.from(document.querySelectorAll(".white-key.blue, .black-key.blue")).map(
      (key) => key.dataset.note
    );
    expect(activeKeys).toContain("C#5");
    expect(activeKeys).toContain("D5");
    const blackLabelNodes = staffSvg.querySelectorAll(".key-label.black");
    const blackLabels = Array.from(blackLabelNodes).map((node) => node.textContent.trim());
    expect(blackLabels).not.toContain("C♯");
    const labelNodes = staffSvg.querySelectorAll("text");
    const labels = Array.from(labelNodes).map((node) => node.textContent);
    const rastCount = labels.filter((label) => label === "Ράστ").length;
    expect(rastCount).toBeGreaterThanOrEqual(2);
  });
});
