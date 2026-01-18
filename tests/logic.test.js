import { describe, expect, test } from "bun:test";
import { intervalInSemitones, parseTetrachordsYaml } from "../logic.js";

describe("parseTetrachordsYaml", () => {
  test("parses tetrachords", () => {
    const yamlText = `- name: Ράστ
  notes: [C, D, E, F]
- name: Ουσάκ
  notes: [D, Eb, F, G]
`;
    const parsed = parseTetrachordsYaml(yamlText);
    expect(parsed.length).toBe(2);
    expect(parsed[0]?.name).toBe("Ράστ");
    expect(parsed[1]?.notes?.join(",")).toBe("D,Eb,F,G");
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
