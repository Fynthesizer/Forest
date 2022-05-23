import * as Tone from "tone";

export const scales = {
  diatonic: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmMinor: [0, 2, 3, 5, 7, 8, 11],
  majorPent: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  chromatic: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  wholeTone: [0, 2, 4, 6, 8, 10],
  persian: [0, 1, 4, 5, 6, 8, 11],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  dom9: [0, 2, 4, 7, 10],
  prometheus: [0, 2, 4, 6, 9, 10],
  diminished: [0, 3, 6, 9],
  hirajoshi: [0, 4, 6, 7, 11],
  iwato: [0, 1, 5, 6, 10],
};

export function lengthToPitch(length, baseFreq, scale) {
  let freq = baseFreq / length;
  let note = Tone.Frequency(freq).toMidi();
  //let note = Tone.Frequency(pitch, "midi").toNote();
  note = quantizeNote(note, scale);

  note = Tone.Frequency(note, "midi").toNote();

  return note;
}

export function quantizeNote(note, scale) {
  let degree = note % 12;
  let octave = Math.floor(note / 12) * 12;
  let closest = scale.sort(
    (a, b) => Math.abs(degree - a) - Math.abs(degree - b)
  )[0];
  let quantizedNote = octave + closest;
  return quantizedNote;
}
