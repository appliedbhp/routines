/**
 * Projection-mode visual themes: each swaps the slice color palette, the
 * stage background, the display font, and the timer/disc accent colors.
 * Print stays ink-conscious (outline-only) regardless of theme, but does
 * pick up the theme's palette (for slice borders) and font.
 */
const THEMES = {
  classic: {
    label: "Classic",
    fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif",
    googleFont: null,
    stageBackground: "radial-gradient(circle at 50% 30%, #232a33 0%, #0e1114 78%)",
    palette: ["#F4A259", "#5B8C5A", "#5D8AA8", "#B25D8E", "#D4A017", "#7C6BAF", "#4E9C81", "#C2543B"],
    accent: "#e53935",
    timerColors: [
      { name: "Red", value: "#e53935" },
      { name: "Orange", value: "#f0932b" },
      { name: "Blue", value: "#3b6e8f" },
      { name: "Green", value: "#4e9c62" },
      { name: "Purple", value: "#8e6bbf" },
    ],
  },
  pixel: {
    label: "Pixel",
    fontFamily: "'Silkscreen', monospace",
    googleFont: "Silkscreen",
    stageBackground: "linear-gradient(160deg, #1a0933 0%, #0d0221 55%, #1a0933 100%)",
    palette: ["#FF3CAC", "#2B86C5", "#F9D423", "#00E5A0", "#7B2FF7", "#FF6B6B", "#00C2FF", "#FFB800"],
    accent: "#00E5A0",
    timerColors: [
      { name: "Neon green", value: "#00E5A0" },
      { name: "Hot pink", value: "#FF3CAC" },
      { name: "Cyan", value: "#00C2FF" },
      { name: "Yellow", value: "#F9D423" },
    ],
  },
  unicorn: {
    label: "Unicorn",
    fontFamily: "'Freckle Face', cursive",
    googleFont: "Freckle Face",
    stageBackground: "radial-gradient(circle at 50% 30%, #3a1f38 0%, #1a0f1c 80%)",
    palette: ["#FFB3DE", "#C9A7EB", "#FFD6E8", "#B5EAEA", "#FFE5B4", "#E0BBE4", "#F7A8C4", "#B8E0D2"],
    accent: "#ff6fae",
    timerColors: [
      { name: "Pink", value: "#ff6fae" },
      { name: "Lavender", value: "#C9A7EB" },
      { name: "Aqua", value: "#B5EAEA" },
      { name: "Peach", value: "#FFE5B4" },
    ],
  },
  farm: {
    label: "Farm",
    fontFamily: "'Flavors', cursive",
    googleFont: "Flavors",
    stageBackground: "radial-gradient(circle at 50% 30%, #2b3a1f 0%, #141b0f 80%)",
    palette: ["#8FBF6B", "#C9A66B", "#6B8E4E", "#A9744F", "#D9C27E", "#5B7F3B", "#E3B23C", "#7A5230"],
    accent: "#8FBF6B",
    timerColors: [
      { name: "Green", value: "#8FBF6B" },
      { name: "Brown", value: "#A9744F" },
      { name: "Gold", value: "#E3B23C" },
      { name: "Olive", value: "#5B7F3B" },
    ],
  },
  safari: {
    label: "Safari",
    fontFamily: "'Sofadi One', cursive",
    googleFont: "Sofadi One",
    stageBackground: "radial-gradient(circle at 50% 30%, #3a2a15 0%, #1a1108 80%)",
    palette: ["#E08A2B", "#3B2A1E", "#C96E23", "#8C5A2B", "#D9A441", "#5C3A1E", "#F2B84B", "#26160C"],
    accent: "#E08A2B",
    timerColors: [
      { name: "Orange", value: "#E08A2B" },
      { name: "Dark brown", value: "#3B2A1E" },
      { name: "Gold", value: "#F2B84B" },
      { name: "Rust", value: "#C96E23" },
    ],
  },
  crafty: {
    label: "Crafty",
    fontFamily: "'Ribeye Marrow', system-ui",
    googleFont: "Ribeye Marrow",
    stageBackground: "radial-gradient(circle at 50% 30%, #2c2a30 0%, #17161a 80%)",
    palette: ["#E7C6C1", "#B8C9A8", "#F5E1A4", "#A9C4D8", "#D9C1E0", "#C9B29B", "#F2D6D6", "#BFD8C9"],
    accent: "#C9B29B",
    timerColors: [
      { name: "Tan", value: "#C9B29B" },
      { name: "Sage", value: "#B8C9A8" },
      { name: "Powder blue", value: "#A9C4D8" },
      { name: "Lavender", value: "#D9C1E0" },
    ],
  },
  ocean: {
    label: "Ocean",
    fontFamily: "'Fascinate Inline', sans-serif",
    googleFont: "Fascinate Inline",
    stageBackground: "radial-gradient(circle at 50% 30%, #012a3a 0%, #00131c 80%)",
    palette: ["#00B4D8", "#0077B6", "#90E0EF", "#48CAE4", "#023E8A", "#ADE8F4", "#00819A", "#CAF0F8"],
    accent: "#00B4D8",
    timerColors: [
      { name: "Cyan", value: "#00B4D8" },
      { name: "Deep blue", value: "#023E8A" },
      { name: "Teal", value: "#00819A" },
      { name: "Aqua", value: "#48CAE4" },
    ],
  },
  space: {
    label: "Space",
    fontFamily: "'Sixtyfour Convergence', sans-serif",
    googleFont: "Sixtyfour Convergence",
    stageBackground: "radial-gradient(circle at 50% 30%, #1b1140 0%, #05030f 80%)",
    palette: ["#7B2FF7", "#2C2A6B", "#00D4FF", "#FF2E9F", "#4A2B8C", "#1B1140", "#9D4EDD", "#3A0CA3"],
    accent: "#00D4FF",
    timerColors: [
      { name: "Cyan", value: "#00D4FF" },
      { name: "Purple", value: "#7B2FF7" },
      { name: "Magenta", value: "#FF2E9F" },
      { name: "Indigo", value: "#3A0CA3" },
    ],
  },
  superhero: {
    label: "Comic",
    uppercase: true,
    fontFamily: "'Yuyu', cursive",
    googleFont: "Yuyu",
    stageBackground: "radial-gradient(circle at 50% 30%, #241a3a 0%, #0f0a17 80%)",
    palette: ["#E63946", "#1D4E89", "#F4C430", "#2A9D3F", "#F4A300", "#3D348B", "#EF476F", "#118AB2"],
    accent: "#E63946",
    timerColors: [
      { name: "Red", value: "#E63946" },
      { name: "Blue", value: "#1D4E89" },
      { name: "Yellow", value: "#F4C430" },
      { name: "Green", value: "#2A9D3F" },
    ],
  },
  mystery: {
    label: "Mystery", fontFamily: "'Syne Mono', monospace", googleFont: "Syne Mono",
    stageBackground: "radial-gradient(circle at 50% 30%, #4A2925, #1E1411 80%)",
    palette: ["#8B3A32", "#A47148", "#632B30", "#BD7050", "#6F4E37", "#C34A43"],
    accent: "#C34A43",
    timerColors: [{ name: "Red", value: "#C34A43" }, { name: "Copper", value: "#BD7050" }, { name: "Brown", value: "#A47148" }],
  },
  flower: {
    label: "Flower", fontFamily: "'Flavors', cursive", googleFont: "Flavors",
    stageBackground: "radial-gradient(circle at 50% 30%, #421946, #190F27 80%)",
    palette: ["#EF3340", "#9B32D9", "#F44FA0", "#FFB52E", "#4AA870", "#734DE2"],
    accent: "#EF3340",
    timerColors: [{ name: "Red", value: "#EF3340" }, { name: "Purple", value: "#9B32D9" }, { name: "Pink", value: "#F44FA0" }],
  },
  boho: {
    label: "Boho", fontFamily: "'Tenor Sans', sans-serif", googleFont: "Tenor Sans",
    stageBackground: "radial-gradient(circle at 50% 30%, #4A3525, #241B14 80%)",
    palette: ["#D9745B", "#E5A93B", "#8A9A86", "#4A3525"],
    accent: "#D9745B",
    timerColors: [{ name: "Terracotta", value: "#D9745B" }, { name: "Ochre", value: "#E5A93B" }, { name: "Sage", value: "#8A9A86" }, { name: "Brown", value: "#4A3525" }],
  },
};

const THEME_ORDER = ["classic", "pixel", "unicorn", "farm", "safari", "crafty", "ocean", "space", "superhero", "mystery", "flower", "boho"];
