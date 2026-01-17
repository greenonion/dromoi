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
  B: 11,
  C5: 12
};

export function normalizeNote(note, enharmonicAliases = {}) {
  return enharmonicAliases[note] || note;
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
