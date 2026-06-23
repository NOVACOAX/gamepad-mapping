export const LIGHTROOM_BASIC_SLIDERS = [
  "Temp",
  "Tint",
  "Exposure",
  "Contrast",
  "Highlights",
  "Shadows",
  "Whites",
  "Blacks",
  "Texture",
  "Clarity",
  "Dehaze",
  "Vibrance",
  "Saturation",
] as const;

export type LightroomSliderName = (typeof LIGHTROOM_BASIC_SLIDERS)[number];
