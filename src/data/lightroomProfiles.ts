import { LIGHTROOM_BASIC_SLIDERS } from "../constants/lightroomSliders";

export { LIGHTROOM_BASIC_SLIDERS };
export type { LightroomSliderName } from "../constants/lightroomSliders";

// Inline profile type to avoid circular dependency with useGamepadMapping
interface ProfileData {
  name: string;
  buttonMappings: Array<{ buttonIndex: number; key: string; label: string }>;
  axisMappings: Array<{
    stickIndex: number;
    direction: string;
    type: string;
    key: string;
    label: string;
    threshold: number;
    cycleDebounceMs?: number;
  }>;
  dpadMappings: Array<{ direction: string; key: string; label: string }>;
}

// PS4/PS5 button indices:
//   Square=2, Triangle=3, L1=4, R1=5
//   Right stick: stickIndex=1, Left stick: stickIndex=0
//
// Key combos: sorted Ctrl(1) < Alt(2) < Shift(3) < Meta(4)
//   Option+Command+C  →  Alt+Meta+c
//   Option+Command+V  →  Alt+Meta+v
//   Command+Z         →  Meta+z

export const LIGHTROOM_LIBRARY_PROFILE: ProfileData = {
  name: "LR Library",
  buttonMappings: [],
  dpadMappings: [
    { direction: "up", key: "]", label: "Increase star" },
    { direction: "down", key: "[", label: "Decrease star" },
  ],
  axisMappings: [
    {
      stickIndex: 1,
      direction: "left",
      type: "hotkey",
      key: "ArrowLeft",
      label: "Prev image",
      threshold: 0.5,
    },
    {
      stickIndex: 1,
      direction: "right",
      type: "hotkey",
      key: "ArrowRight",
      label: "Next image",
      threshold: 0.5,
    },
  ],
};

export const LIGHTROOM_DEVELOP_PROFILE: ProfileData = {
  name: "LR Develop",
  buttonMappings: [
    { buttonIndex: 2, key: "Meta+z", label: "Undo" },
    { buttonIndex: 3, key: "v", label: "Toggle B&W" },
    { buttonIndex: 4, key: "Alt+Meta+c", label: "Copy settings" },
    { buttonIndex: 5, key: "Alt+Meta+v", label: "Paste settings" },
  ],
  dpadMappings: [
    { direction: "up", key: "]", label: "Increase star" },
    { direction: "down", key: "[", label: "Decrease star" },
  ],
  axisMappings: [
    {
      stickIndex: 1,
      direction: "left",
      type: "hotkey",
      key: "ArrowLeft",
      label: "Prev image",
      threshold: 0.5,
    },
    {
      stickIndex: 1,
      direction: "right",
      type: "hotkey",
      key: "ArrowRight",
      label: "Next image",
      threshold: 0.5,
    },
    {
      stickIndex: 0,
      direction: "up",
      type: "lightroom-sliders",
      key: "",
      label: "LR Basic Sliders",
      threshold: 0.4,
      cycleDebounceMs: 350,
    },
  ],
};
