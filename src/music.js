import * as Tone from "tone";

/*
export const scales = {
  diatonic: { notes: [0, 2, 4, 5, 7, 9, 11], name: "Diatonic", index: 0 }, //❤️
  pentatonic: { notes: [0, 2, 4, 7, 9], name: "Pentatonic", index: 1 }, //❤️
  hirajoshi: { notes: [0, 4, 6, 7, 11], name: "Hirajōshi", index: 2 }, //❤️
  //iwato: { notes: [0, 1, 5, 6, 10], name: "Iwato" },
  insen: { notes: [0, 1, 5, 7, 10], name: "Insen", index: 3 }, //❤️
  //evil: { notes: [0, 3, 7, 8, 11], name: "Evil" },
  acoustic: { notes: [0, 2, 4, 6, 7, 9, 10], name: "Acoustic", index: 4 }, //❤️
  //prometheus: { notes: [0, 2, 4, 6, 9, 10], name: "Prometheus" },
  dominant: { notes: [0, 2, 4, 7, 10], name: "Dominant", index: 5 }, //❤️
  wholeTone: { notes: [0, 2, 4, 6, 8, 10], name: "Whole Tone", index: 6 }, //❤️
  //phrygian: { notes: [0, 1, 4, 5, 7, 8, 10], name: "Phrygian" },
  //augmented: { notes: [0, 3, 4, 7, 8, 11], name: "Augmented" },
  //pretty: { notes: [0, 2, 4, 7, 9, 11], name: "Pretty" }, //Diatonic major scale without the fourth
  //hungarian: { notes: [0, 2, 3, 6, 7, 8, 11], name: "Hungarian" }, //Diatonic major scale without the fourth
};
*/

export const scales = [
  { notes: [0, 2, 4, 5, 7, 9, 11], name: "Diatonic", index: 0 }, //❤️
  { notes: [0, 2, 4, 7, 9], name: "Pentatonic", index: 1 }, //❤️
  { notes: [0, 4, 6, 7, 11], name: "Hirajōshi", index: 2 }, //❤️
  //iwato: { notes: [0, 1, 5, 6, 10], name: "Iwato" },
  { notes: [0, 1, 5, 7, 10], name: "Insen", index: 3 }, //❤️
  //evil: { notes: [0, 3, 7, 8, 11], name: "Evil" },
  { notes: [0, 2, 4, 6, 7, 9, 10], name: "Acoustic", index: 4 }, //❤️
  //prometheus: { notes: [0, 2, 4, 6, 9, 10], name: "Prometheus" },
  { notes: [0, 2, 4, 7, 10], name: "Dominant", index: 5 }, //❤️
  { notes: [0, 2, 4, 6, 8, 10], name: "Whole Tone", index: 6 }, //❤️
  //phrygian: { notes: [0, 1, 4, 5, 7, 8, 10], name: "Phrygian" },
  //augmented: { notes: [0, 3, 4, 7, 8, 11], name: "Augmented" },
  //pretty: { notes: [0, 2, 4, 7, 9, 11], name: "Pretty" }, //Diatonic major scale without the fourth
  //hungarian: { notes: [0, 2, 3, 6, 7, 8, 11], name: "Hungarian" }, //Diatonic major scale without the fourth
];

/*
export const oscillators = {
  pulse: { name: "Pulse", key: "pulse" },
  sine: { name: "Sine", key: "sine" },
  sawtooth: { name: "Saw", key: "sawtooth" },
  triangle: { name: "Triangle", key: "triangle" },
  square: { name: "Square", key: "square" },
  //fatsawtooth: { name: "Fat Saw", key: "fatsawtooth" },
  //fatsquare: { name: "Fat Square", key: "fatsquare" },
  //fmsquare: { name: "FM Square", key: "fmsquare" },
  //fmsawtooth: { name: "FM Saw", key: "fmsawtooth" },
};
*/

export const oscillators = [
  { name: "Pulse", key: "pulse" },
  { name: "Sine", key: "sine" },
  { name: "Saw", key: "sawtooth" },
  { name: "Triangle", key: "triangle" },
  { name: "Square", key: "square" },
  //{ name: "Fat Saw", key: "fatsawtooth" },
  //{ name: "Fat Square", key: "fatsquare" },
  //{ name: "Fat Triangle", key: "fattriangle" },
  //fmsquare: { name: "FM Square", key: "fmsquare" },
  //fmsawtooth: { name: "FM Saw", key: "fmsawtooth" },
];

export function lengthToPitch(length, baseFreq, scale) {
  let freq = baseFreq / length;
  let note = Tone.Frequency(freq).toMidi();
  note = quantizeNote(note, scale);
  note = Tone.Frequency(note, "midi").toNote();

  return note;
}

//Quantize note to nearest note in scale
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
