export const noteToSemitone = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11
};

export function normalizeNote(note, enharmonicAliases = {}) {
  if (!note) {
    return note;
  }
  const stripped = note.replace(/\d+/g, "");
  return enharmonicAliases[stripped] || stripped;
}

export function intervalInSemitones(startNote, endNote, enharmonicAliases = {}) {
  if (!startNote || !endNote) {
    return null;
  }
  const startStep = noteToSemitone[normalizeNote(startNote, enharmonicAliases)];
  const endStep = noteToSemitone[normalizeNote(endNote, enharmonicAliases)];
  if (startStep == null || endStep == null) {
    return null;
  }
  const diff = endStep - startStep;
  return diff < 0 ? diff + 12 : diff;
}

export function parseTetrachordsYaml(text) {
  return parseSimpleNotesYaml(text);
}

export function parseIntervalsYaml(text) {
  return parseSimpleIntervalsYaml(text);
}

export function parseScaleSongsYaml(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;
  let currentSong = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    if (trimmed.startsWith("- scale:")) {
      if (current) {
        items.push(current);
      }
      current = { scale: trimmed.replace("- scale:", "").trim(), songs: [] };
      currentSong = null;
      return;
    }
    if (!current) {
      return;
    }
    if (trimmed.startsWith("- title:")) {
      currentSong = { title: trimmed.replace("- title:", "").trim() };
      current.songs.push(currentSong);
      return;
    }
    if (!currentSong) {
      return;
    }
    if (trimmed.startsWith("link:")) {
      currentSong.link = trimmed.replace("link:", "").trim();
      return;
    }
    if (trimmed.startsWith("creators:")) {
      currentSong.creators = trimmed.replace("creators:", "").trim();
      return;
    }
    if (trimmed.startsWith("singers:")) {
      currentSong.singers = trimmed.replace("singers:", "").trim();
      return;
    }
  });
  if (current) {
    items.push(current);
  }
  return items;
}

export function parseScaleCombosYaml(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;
  let currentPart = null;
  let currentSection = "asc";
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    if (trimmed.startsWith("-")) {
      if (current) {
        items.push(current);
      }
      current = { name: "", first: null, second: null, descending: null };
      currentPart = null;
      currentSection = "asc";
      const nameMatch = trimmed.match(/-\s*name:\s*(.+)/);
      if (nameMatch) {
        current.name = nameMatch[1].trim();
      }
      return;
    }
    if (!current) {
      return;
    }
    if (trimmed.startsWith("descending:")) {
      current.descending = { first: null, second: null };
      currentSection = "desc";
      currentPart = null;
      return;
    }
    if (trimmed.startsWith("name:") && currentPart) {
      currentPart.name = trimmed.replace("name:", "").trim();
      return;
    }
    if (trimmed.startsWith("name:")) {
      current.name = trimmed.replace("name:", "").trim();
      return;
    }
    if (trimmed.startsWith("first:")) {
      const target = currentSection === "desc" ? current.descending : current;
      target.first = { name: "", type: "" };
      currentPart = target.first;
      const remainder = trimmed.replace("first:", "").trim();
      if (remainder) {
        target.first.name = remainder;
      }
      return;
    }
    if (trimmed.startsWith("second:")) {
      const target = currentSection === "desc" ? current.descending : current;
      target.second = { name: "", type: "" };
      currentPart = target.second;
      const remainder = trimmed.replace("second:", "").trim();
      if (remainder) {
        target.second.name = remainder;
      }
      return;
    }
    if (trimmed.startsWith("type:")) {
      if (currentPart) {
        currentPart.type = trimmed.replace("type:", "").trim();
      }
      return;
    }
  });
  if (current) {
    items.push(current);
  }
  return items.filter((item) => item.name);
}

export function buildNotesFromIntervals(intervals, startNote, enharmonicAliases = {}) {
  if (!intervals?.length || !startNote) {
    return [];
  }
  const startIndex = noteIndexFromNote(startNote, enharmonicAliases);
  if (startIndex == null) {
    return [];
  }
  const steps = [startIndex];
  intervals.forEach((interval) => {
    const last = steps[steps.length - 1];
    steps.push(last + interval);
  });
  return steps.map((step) => {
    const semitone = ((step % 12) + 12) % 12;
    const base = semitoneToNote[semitone] || "C";
    return step >= 12 ? `${base}5` : base;
  });
}

function noteIndexFromNote(note, enharmonicAliases) {
  if (!note) {
    return null;
  }
  const normalized = normalizeNote(note, enharmonicAliases);
  const baseStep = noteToSemitone[normalized];
  if (baseStep == null) {
    return null;
  }
  if (note === "C5") {
    return baseStep + 12;
  }
  return baseStep;
}

const semitoneToNote = {
  0: "C",
  1: "C#",
  2: "D",
  3: "Eb",
  4: "E",
  5: "F",
  6: "F#",
  7: "G",
  8: "Ab",
  9: "A",
  10: "Bb",
  11: "B"
};

function parseSimpleNotesYaml(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    if (trimmed.startsWith("-")) {
      if (current) {
        items.push(current);
      }
      current = { name: "", notes: [] };
      const nameMatch = trimmed.match(/-\s*name:\s*(.+)/);
      if (nameMatch) {
        current.name = nameMatch[1].trim();
      }
      return;
    }
    if (!current) {
      return;
    }
    if (trimmed.startsWith("name:")) {
      current.name = trimmed.replace("name:", "").trim();
    } else if (trimmed.startsWith("notes:")) {
      const listMatch = trimmed.match(/notes:\s*\[(.+)\]/);
      if (listMatch) {
        current.notes = listMatch[1].split(",").map((note) => note.trim());
      }
    } else if (trimmed.startsWith("-") && current.notes) {
      current.notes.push(trimmed.replace("-", "").trim());
    }
  });
  if (current) {
    items.push(current);
  }
  return items;
}

function parseSimpleIntervalsYaml(text) {
  const lines = text.split(/\r?\n/);
  const items = [];
  let current = null;
  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    if (trimmed.startsWith("-")) {
      if (current) {
        items.push(current);
      }
      current = { name: "", intervals: [] };
      const nameMatch = trimmed.match(/-\s*name:\s*(.+)/);
      if (nameMatch) {
        current.name = nameMatch[1].trim();
      }
      return;
    }
    if (!current) {
      return;
    }
    if (trimmed.startsWith("name:")) {
      current.name = trimmed.replace("name:", "").trim();
    } else if (trimmed.startsWith("intervals:")) {
      const listMatch = trimmed.match(/intervals:\s*\[(.+)\]/);
      if (listMatch) {
        current.intervals = listMatch[1]
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isFinite(value));
      }
    } else if (trimmed.startsWith("-") && current.intervals) {
      const value = Number(trimmed.replace("-", "").trim());
      if (Number.isFinite(value)) {
        current.intervals.push(value);
      }
    }
  });
  if (current) {
    items.push(current);
  }
  return items;
}
