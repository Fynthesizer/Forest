import * as Tone from "tone";

export const scales = {
  diatonic: { notes: [0, 2, 4, 5, 7, 9, 11], name: "Diatonic" },
  pentatonic: { notes: [0, 2, 4, 7, 9], name: "Pentatonic" },
  hirajoshi: { notes: [0, 4, 6, 7, 11], name: "Hirajōshi" },
  iwato: { notes: [0, 1, 5, 6, 10], name: "Iwato" },
  wholeTone: { notes: [0, 2, 4, 6, 8, 10], name: "Whole Tone" },
  //evil: { notes: [0, 3, 7, 8, 11], name: "Evil" },
  acoustic: { notes: [0, 2, 4, 6, 7, 9, 10], name: "Acoustic" },
  prometheus: { notes: [0, 2, 4, 6, 9, 10], name: "Prometheus" },
  dom9: { notes: [0, 2, 4, 7, 10], name: "Dominant 9" },
  pretty: { notes: [0, 2, 4, 7, 9, 11], name: "Pretty" }, //Diatonic major scale without the fourth
};

export const oscillators = {
  pulse: { name: "Pulse", key: "pulse" },
  sine: { name: "Sine", key: "sine" },
  sawtooth: { name: "Saw", key: "sawtooth" },
  triangle: { name: "Triangle", key: "triangle" },
  square: { name: "Square", key: "square" },
};

export function lengthToPitch(length, baseFreq, scale) {
  let freq = baseFreq / length;
  let note = Tone.Frequency(freq).toMidi();
  note = quantizeNote(note, scale);
  note = Tone.Frequency(note, "midi").toNote();

  return note;
}

export function quantizeNote(note, scale) {
  let degree = note % 12;
  let octave = Math.floor(note / 12) * 12;
  let notes = scale.notes;
  let closest = notes.sort(
    (a, b) => Math.abs(degree - a) - Math.abs(degree - b)
  )[0];
  let quantizedNote = octave + closest;
  return quantizedNote;
}
