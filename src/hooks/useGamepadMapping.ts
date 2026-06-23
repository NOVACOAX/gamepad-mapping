import { useState, useCallback, useEffect, useRef } from "react";
import { GamepadState } from "./useGamepad";
import {
  getStickDirection,
  getDpadDirection,
  getStickAxes,
} from "../utils/stickDirection";
import {
  DEFAULT_STICK_THRESHOLD,
  DEFAULT_MOUSE_SENSITIVITY,
  DEFAULT_MOUSE_ACCELERATION,
  DEFAULT_MOUSE_INVERT_X,
  DEFAULT_MOUSE_INVERT_Y,
  DEFAULT_STICK_MAPPING_TYPE,
} from "../constants/defaults";
import { LIGHTROOM_BASIC_SLIDERS } from "../constants/lightroomSliders";

export interface ButtonMapping {
  buttonIndex: number;
  key: string;
  label: string;
}

export type StickDirection =
  | "up"
  | "down"
  | "left"
  | "right"
  | "up-left"
  | "up-right"
  | "down-left"
  | "down-right";

export type StickMappingType = "hotkey" | "mouse" | "lightroom-sliders";

export interface AxisMapping {
  stickIndex: number;
  direction: StickDirection;
  key: string;
  label: string;
  threshold: number;
  type: StickMappingType;
  sensitivity?: number;
  acceleration?: number;
  invertX?: boolean;
  invertY?: boolean;
  cycleDebounceMs?: number;
}

export interface DpadMapping {
  direction: StickDirection;
  key: string;
  label: string;
}

export interface GamepadProfile {
  id: string;
  name: string;
  buttonMappings: ButtonMapping[];
  axisMappings: AxisMapping[];
  dpadMappings: DpadMapping[];
}

export interface GamepadMapping {
  gamepadIndex: number;
  // Default (non-profile) mappings — used when activeProfileId is ""
  buttonMappings: ButtonMapping[];
  axisMappings: AxisMapping[];
  dpadMappings: DpadMapping[];
  // Profile system
  profiles: GamepadProfile[];
  activeProfileId: string;
}

const STORAGE_KEY = "gamepad-mappings";

function migrateMapping(raw: any): GamepadMapping {
  return {
    gamepadIndex: raw.gamepadIndex,
    buttonMappings: raw.buttonMappings ?? [],
    axisMappings: raw.axisMappings ?? [],
    dpadMappings: raw.dpadMappings ?? [],
    profiles: raw.profiles ?? [],
    activeProfileId: raw.activeProfileId ?? "",
  };
}

function getActiveMappings(mapping: GamepadMapping): {
  buttonMappings: ButtonMapping[];
  axisMappings: AxisMapping[];
  dpadMappings: DpadMapping[];
} {
  if (mapping.activeProfileId) {
    const profile = mapping.profiles.find((p) => p.id === mapping.activeProfileId);
    if (profile) {
      return {
        buttonMappings: profile.buttonMappings,
        axisMappings: profile.axisMappings,
        dpadMappings: profile.dpadMappings,
      };
    }
  }
  return {
    buttonMappings: mapping.buttonMappings,
    axisMappings: mapping.axisMappings,
    dpadMappings: mapping.dpadMappings,
  };
}

export function useGamepadMapping(gamepads: GamepadState[]) {
  const [mappings, setMappings] = useState<GamepadMapping[]>([]);
  const [editingButton, setEditingButton] = useState<{
    gamepadIndex: number;
    buttonIndex: number;
  } | null>(null);
  const [editingAxis, setEditingAxis] = useState<{
    gamepadIndex: number;
    stickIndex: number;
    direction: StickDirection;
  } | null>(null);
  const [editingDpad, setEditingDpad] = useState<{
    gamepadIndex: number;
    direction: StickDirection;
  } | null>(null);

  // Load mappings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMappings(
          Array.isArray(parsed) ? parsed.map(migrateMapping) : []
        );
      } catch (e) {
        console.error("Failed to load mappings:", e);
      }
    }
  }, []);

  // Initialize mappings for new gamepads
  useEffect(() => {
    setMappings((prev) => {
      const updated = [...prev];
      gamepads.forEach((gamepad) => {
        const existing = updated.find((m) => m.gamepadIndex === gamepad.index);
        if (!existing) {
          updated.push({
            gamepadIndex: gamepad.index,
            buttonMappings: [],
            axisMappings: [],
            dpadMappings: [],
            profiles: [],
            activeProfileId: "",
          });
        }
      });
      return updated;
    });
  }, [gamepads]);

  // Save mappings to localStorage
  useEffect(() => {
    if (mappings.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
    }
  }, [mappings]);

  const getMapping = useCallback(
    (gamepadIndex: number): GamepadMapping | undefined => {
      return mappings.find((m) => m.gamepadIndex === gamepadIndex);
    },
    [mappings]
  );

  const getMouseMappings = useCallback((mapping: GamepadMapping) => {
    const { axisMappings } = getActiveMappings(mapping);
    return axisMappings.filter((m) => m.type === "mouse");
  }, []);

  // --- Profile management ---

  const addProfile = useCallback(
    (
      gamepadIndex: number,
      profile: Omit<GamepadProfile, "id">
    ): string => {
      const id = `profile-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setMappings((prev) => {
        const updated = [...prev];
        const mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (mapping) {
          mapping.profiles = [...mapping.profiles, { ...profile, id }];
        }
        return updated;
      });
      return id;
    },
    []
  );

  const removeProfile = useCallback(
    (gamepadIndex: number, profileId: string) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (mapping) {
          mapping.profiles = mapping.profiles.filter((p) => p.id !== profileId);
          if (mapping.activeProfileId === profileId) {
            mapping.activeProfileId = "";
          }
        }
        return updated;
      });
    },
    []
  );

  const setActiveProfile = useCallback(
    (gamepadIndex: number, profileId: string) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (mapping) {
          mapping.activeProfileId = profileId;
        }
        return updated;
      });
    },
    []
  );

  const addLightroomProfiles = useCallback(
    (
      gamepadIndex: number,
      libraryProfile: Omit<GamepadProfile, "id">,
      developProfile: Omit<GamepadProfile, "id">
    ) => {
      setMappings((prev) => {
        const LIGHTROOM_LIBRARY_PROFILE = libraryProfile;
        const LIGHTROOM_DEVELOP_PROFILE = developProfile;
        const updated = [...prev];
        let mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) {
          mapping = {
            gamepadIndex,
            buttonMappings: [],
            axisMappings: [],
            dpadMappings: [],
            profiles: [],
            activeProfileId: "",
          };
          updated.push(mapping);
        }

        const libraryExists = mapping.profiles.some((p) => p.name === "LR Library");
        const developExists = mapping.profiles.some((p) => p.name === "LR Develop");

        if (!libraryExists) {
          mapping.profiles = [
            ...mapping.profiles,
            {
              ...LIGHTROOM_LIBRARY_PROFILE,
              id: `lr-library-${gamepadIndex}`,
            },
          ];
        }
        if (!developExists) {
          mapping.profiles = [
            ...mapping.profiles,
            {
              ...LIGHTROOM_DEVELOP_PROFILE,
              id: `lr-develop-${gamepadIndex}`,
            },
          ];
        }

        return updated;
      });
    },
    []
  );

  // --- Existing CRUD functions (operate on active profile or default) ---

  const setButtonMapping = useCallback(
    (gamepadIndex: number, buttonIndex: number, key: string, label: string) => {
      setMappings((prev) => {
        const updated = [...prev];
        let mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) {
          mapping = {
            gamepadIndex,
            buttonMappings: [],
            axisMappings: [],
            dpadMappings: [],
            profiles: [],
            activeProfileId: "",
          };
          updated.push(mapping);
        }

        const target = mapping.activeProfileId
          ? mapping.profiles.find((p) => p.id === mapping!.activeProfileId)
          : mapping;

        if (!target) return updated;

        const existing = target.buttonMappings.find(
          (m) => m.buttonIndex === buttonIndex
        );
        if (existing) {
          existing.key = key;
          existing.label = label;
        } else {
          target.buttonMappings.push({ buttonIndex, key, label });
        }
        return updated;
      });
      setEditingButton(null);
    },
    []
  );

  const setAxisMapping = useCallback(
    (
      gamepadIndex: number,
      stickIndex: number,
      direction: StickDirection,
      key: string,
      label: string,
      threshold: number = DEFAULT_STICK_THRESHOLD,
      type: StickMappingType = DEFAULT_STICK_MAPPING_TYPE,
      sensitivity: number = DEFAULT_MOUSE_SENSITIVITY,
      acceleration: number = DEFAULT_MOUSE_ACCELERATION,
      invertX: boolean = DEFAULT_MOUSE_INVERT_X,
      invertY: boolean = DEFAULT_MOUSE_INVERT_Y
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        let mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) {
          mapping = {
            gamepadIndex,
            buttonMappings: [],
            axisMappings: [],
            dpadMappings: [],
            profiles: [],
            activeProfileId: "",
          };
          updated.push(mapping);
        }

        const target = mapping.activeProfileId
          ? mapping.profiles.find((p) => p.id === mapping!.activeProfileId)
          : mapping;

        if (!target) return updated;

        if (type === "mouse") {
          const existingMouse = target.axisMappings.find(
            (m) => m.stickIndex === stickIndex && m.type === "mouse"
          );
          if (existingMouse) {
            existingMouse.threshold = threshold;
            existingMouse.sensitivity = sensitivity;
            existingMouse.acceleration = acceleration;
            existingMouse.invertX = invertX;
            existingMouse.invertY = invertY;
          } else {
            target.axisMappings = target.axisMappings.filter(
              (m) => !(m.stickIndex === stickIndex && m.type === "hotkey")
            );
            target.axisMappings.push({
              stickIndex,
              direction: "up",
              key: "Mouse",
              label: "Mouse",
              threshold,
              type: "mouse",
              sensitivity,
              acceleration,
              invertX,
              invertY,
            });
          }
        } else {
          const existingHotkey = target.axisMappings.find(
            (m) =>
              m.stickIndex === stickIndex &&
              m.direction === direction &&
              m.type === "hotkey"
          );
          if (existingHotkey) {
            existingHotkey.key = key;
            existingHotkey.label = label;
            existingHotkey.threshold = threshold;
          } else {
            target.axisMappings = target.axisMappings.filter(
              (m) => !(m.stickIndex === stickIndex && m.type === "mouse")
            );
            target.axisMappings.push({
              stickIndex,
              direction,
              key,
              label,
              threshold,
              type: "hotkey",
            });
          }
        }

        return updated;
      });
      setEditingAxis(null);
    },
    []
  );

  const removeButtonMapping = useCallback(
    (gamepadIndex: number, buttonIndex: number) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) return updated;
        const target = mapping.activeProfileId
          ? mapping.profiles.find((p) => p.id === mapping.activeProfileId)
          : mapping;
        if (target) {
          target.buttonMappings = target.buttonMappings.filter(
            (m) => m.buttonIndex !== buttonIndex
          );
        }
        return updated;
      });
    },
    []
  );

  const removeAxisMapping = useCallback(
    (gamepadIndex: number, stickIndex: number, direction: StickDirection) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) return updated;
        const target = mapping.activeProfileId
          ? mapping.profiles.find((p) => p.id === mapping.activeProfileId)
          : mapping;
        if (target) {
          target.axisMappings = target.axisMappings.filter(
            (m) => !(m.stickIndex === stickIndex && m.direction === direction)
          );
        }
        return updated;
      });
    },
    []
  );

  const setDpadMapping = useCallback(
    (
      gamepadIndex: number,
      direction: StickDirection,
      key: string,
      label: string
    ) => {
      setMappings((prev) => {
        const updated = [...prev];
        let mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) {
          mapping = {
            gamepadIndex,
            buttonMappings: [],
            axisMappings: [],
            dpadMappings: [],
            profiles: [],
            activeProfileId: "",
          };
          updated.push(mapping);
        }

        const target = mapping.activeProfileId
          ? mapping.profiles.find((p) => p.id === mapping!.activeProfileId)
          : mapping;

        if (!target) return updated;

        const existing = target.dpadMappings.find((m) => m.direction === direction);
        if (existing) {
          existing.key = key;
          existing.label = label;
        } else {
          target.dpadMappings.push({ direction, key, label });
        }

        return updated;
      });
      setEditingDpad(null);
    },
    []
  );

  const removeDpadMapping = useCallback(
    (gamepadIndex: number, direction: StickDirection) => {
      setMappings((prev) => {
        const updated = [...prev];
        const mapping = updated.find((m) => m.gamepadIndex === gamepadIndex);
        if (!mapping) return updated;
        const target = mapping.activeProfileId
          ? mapping.profiles.find((p) => p.id === mapping.activeProfileId)
          : mapping;
        if (target) {
          target.dpadMappings = target.dpadMappings.filter(
            (m) => m.direction !== direction
          );
        }
        return updated;
      });
    },
    []
  );

  const getFallbackDirections = useCallback(
    (direction: StickDirection): StickDirection[] => {
      switch (direction) {
        case "up-left": return ["up", "left"];
        case "up-right": return ["up", "right"];
        case "down-left": return ["down", "left"];
        case "down-right": return ["down", "right"];
        default: return [];
      }
    },
    []
  );

  // Track which stateKeys are holding each key
  const keyHoldersRef = useRef<Map<string, Set<string>>>(new Map());
  const previousButtonStatesRef = useRef<Map<string, boolean>>(new Map());
  const previousAxisStatesRef = useRef<Map<string, boolean>>(new Map());
  const pendingMouseMovementsRef = useRef<Set<string>>(new Set());
  const stickMovementStartTimeRef = useRef<Map<string, number>>(new Map());

  // Lightroom slider state — index also exposed as state for UI
  const [currentLrSliderIndex, setCurrentLrSliderIndexState] = useState(0);
  const currentSliderIndexRef = useRef<number>(0);
  const lastAdjustTimeRef = useRef<number>(0);
  const pendingSliderAdjustRef = useRef<boolean>(false);
  const prevLrAxisActiveRef = useRef<Map<string, boolean>>(new Map());

  const setCurrentLrSliderIndex = useCallback((index: number) => {
    currentSliderIndexRef.current = index;
    setCurrentLrSliderIndexState(index);
  }, []);

  const simulateKeyPress = useCallback(
    async (key: string, pressed: boolean, stateKey: string) => {
      const previousState =
        previousButtonStatesRef.current.get(stateKey) ??
        previousAxisStatesRef.current.get(stateKey);
      if (previousState === pressed) return;

      if (stateKey.startsWith("button-")) {
        previousButtonStatesRef.current.set(stateKey, pressed);
      } else {
        previousAxisStatesRef.current.set(stateKey, pressed);
      }

      if (!keyHoldersRef.current.has(key)) {
        keyHoldersRef.current.set(key, new Set());
      }
      const holders = keyHoldersRef.current.get(key)!;
      const wasPressed = holders.size > 0;

      if (pressed) {
        holders.add(stateKey);
        if (!wasPressed) {
          try {
            let result;
            if (key.startsWith("Mouse")) {
              if (!window.mouseSimulator) return;
              result = await window.mouseSimulator.buttonToggle(key, true);
            } else {
              if (!window.keySimulator) return;
              result = await window.keySimulator.keyToggle(key, true);
            }
            if (result && !result.success && result.error) {
              console.error("Input simulation error:", result.error);
            }
          } catch (error) {
            console.error("Error pressing key/button:", error);
          }
        }
      } else {
        holders.delete(stateKey);
        if (wasPressed && holders.size === 0) {
          try {
            let result;
            if (key.startsWith("Mouse")) {
              if (!window.mouseSimulator) return;
              result = await window.mouseSimulator.buttonToggle(key, false);
            } else {
              if (!window.keySimulator) return;
              result = await window.keySimulator.keyToggle(key, false);
            }
            if (result && !result.success && result.error) {
              console.error("Input simulation error:", result.error);
            }
          } catch (error) {
            console.error("Error releasing key/button:", error);
          }
        }
      }
    },
    []
  );

  // Check and trigger mappings based on gamepad state
  useEffect(() => {
    gamepads.forEach((gamepad) => {
      const mapping = getMapping(gamepad.index);
      if (!mapping) return;

      const { buttonMappings, axisMappings, dpadMappings } =
        getActiveMappings(mapping);

      // Button mappings
      buttonMappings.forEach((btnMapping) => {
        const button = gamepad.buttons[btnMapping.buttonIndex];
        if (button) {
          const stateKey = `gamepad-${gamepad.index}-button-${btnMapping.buttonIndex}`;
          simulateKeyPress(btnMapping.key, button.pressed, stateKey);
        }
      });

      // D-pad mappings
      if (dpadMappings.length > 0) {
        const currentDirection = getDpadDirection(gamepad.buttons);
        const hasDirectMapping =
          currentDirection &&
          dpadMappings.some((m) => m.direction === currentDirection);

        dpadMappings.forEach((dpadMapping) => {
          const stateKey = `gamepad-${gamepad.index}-dpad-${dpadMapping.direction}`;
          let isActive = false;
          if (currentDirection === dpadMapping.direction) {
            isActive = true;
          } else if (currentDirection && !hasDirectMapping) {
            const fallbacks = getFallbackDirections(currentDirection);
            isActive = fallbacks.includes(dpadMapping.direction);
          }
          simulateKeyPress(dpadMapping.key, isActive, stateKey);
        });
      }

      // Axis mappings
      const mouseMappings = axisMappings.filter((m) => m.type === "mouse");
      const sticksWithMouse = new Set(mouseMappings.map((m) => m.stickIndex));
      const lrSliderMappings = axisMappings.filter(
        (m) => m.type === "lightroom-sliders"
      );
      const sticksWithLrSliders = new Set(lrSliderMappings.map((m) => m.stickIndex));
      const processedMouseSticks = new Set<number>();

      // Mouse mode
      mouseMappings.forEach((mouseMapping) => {
        const stickIndex = mouseMapping.stickIndex;
        if (processedMouseSticks.has(stickIndex)) return;
        processedMouseSticks.add(stickIndex);

        const { axisXIndex, axisYIndex } = getStickAxes(stickIndex);
        let stickX = gamepad.axes[axisXIndex] || 0;
        let stickY = gamepad.axes[axisYIndex] || 0;

        if (mouseMapping.invertX) stickX = -stickX;
        if (mouseMapping.invertY) stickY = -stickY;

        const absX = Math.abs(stickX);
        const absY = Math.abs(stickY);
        const threshold = mouseMapping.threshold;
        const inDeadzone = absX < threshold && absY < threshold;
        const mouseStateKey = `gamepad-${gamepad.index}-mouse-${stickIndex}`;

        if (inDeadzone) {
          stickMovementStartTimeRef.current.delete(mouseStateKey);
          return;
        }

        const sensitivity = mouseMapping.sensitivity ?? DEFAULT_MOUSE_SENSITIVITY;
        const acceleration = mouseMapping.acceleration ?? DEFAULT_MOUSE_ACCELERATION;
        const now = Date.now();

        if (!stickMovementStartTimeRef.current.has(mouseStateKey)) {
          stickMovementStartTimeRef.current.set(mouseStateKey, now);
        }
        const movementDurationSeconds =
          (now - stickMovementStartTimeRef.current.get(mouseStateKey)!) / 1000;

        let normalizedX = 0;
        let normalizedY = 0;
        if (absX >= threshold) {
          const signX = stickX >= 0 ? 1 : -1;
          normalizedX = (signX * (absX - threshold)) / (1 - threshold);
        }
        if (absY >= threshold) {
          const signY = stickY >= 0 ? 1 : -1;
          normalizedY = (signY * (absY - threshold)) / (1 - threshold);
        }

        let accelerationMultiplier = 1.0;
        if (acceleration !== 1.0 && movementDurationSeconds > 0) {
          accelerationMultiplier = Math.pow(acceleration, movementDurationSeconds);
        }

        const deltaX = normalizedX * sensitivity * accelerationMultiplier * 10;
        const deltaY = normalizedY * sensitivity * accelerationMultiplier * 10;

        let finalStickX = gamepad.axes[axisXIndex] || 0;
        let finalStickY = gamepad.axes[axisYIndex] || 0;
        if (mouseMapping.invertX) finalStickX = -finalStickX;
        if (mouseMapping.invertY) finalStickY = -finalStickY;

        if (Math.abs(finalStickX) < threshold && Math.abs(finalStickY) < threshold) {
          stickMovementStartTimeRef.current.delete(mouseStateKey);
          return;
        }

        if (pendingMouseMovementsRef.current.has(mouseStateKey)) return;

        if (window.mouseSimulator) {
          pendingMouseMovementsRef.current.add(mouseStateKey);
          window.mouseSimulator
            .moveMouse(deltaX, deltaY)
            .then(() => pendingMouseMovementsRef.current.delete(mouseStateKey))
            .catch(() => pendingMouseMovementsRef.current.delete(mouseStateKey));
        }
      });

      // Lightroom sliders mode
      lrSliderMappings.forEach((lrMapping) => {
        const stickIndex = lrMapping.stickIndex;
        const { axisXIndex } = getStickAxes(stickIndex);
        const stickX = gamepad.axes[axisXIndex] || 0;
        const threshold = lrMapping.threshold;
        const adjustRepeatMs = 150;
        const now = Date.now();

        // Helper: update selected slider and click its label via nut-js hardware mouse event.
        // AppleScript is used READ-ONLY (to get coordinates) because LR ignores AS "click at".
        // nut-js uses CGEvent — identical to a physical mouse click — which LR does respond to.
        const cycleTo = (newIndex: number) => {
          setCurrentLrSliderIndex(newIndex);
          const sliderName = LIGHTROOM_BASIC_SLIDERS[newIndex];
          window.hud?.show(sliderName, "Basic Panel");

          if (window.appleScript && window.mouseSimulator) {
            const idx = newIndex + 1;
            (async () => {
              try {
                const res = await window.appleScript!.run(`
tell application "System Events"
  tell process "Adobe Lightroom Classic"
    set allSliders to every slider of entire contents of window 1
    if (count of allSliders) >= ${idx} then
      set s to item ${idx} of allSliders
      set sPos to position of s
      set sSz to size of s
      set lx to ((item 1 of sPos) - 70) as integer
      set ly to ((item 2 of sPos) + (item 2 of sSz) / 2) as integer
      return (lx as text) & "," & (ly as text)
    end if
    return "0,0"
  end tell
end tell`);
                if (res.success && res.result && res.result !== "0,0") {
                  const parts = res.result.trim().split(",");
                  const x = parseInt(parts[0], 10);
                  const y = parseInt(parts[1], 10);
                  if (x > 0 && y > 0) {
                    await window.mouseSimulator!.clickAt(x, y);
                  }
                }
              } catch {
                // cycling still updates the app UI even if LR click fails
              }
            })();
          }
        };

        // D-pad left (button 14) = previous slider, D-pad right (button 15) = next slider
        // Edge-triggered so each press cycles exactly once.
        const dpadLeft = gamepad.buttons[14]?.pressed ?? false;
        const dpadRight = gamepad.buttons[15]?.pressed ?? false;
        const dpadLeftKey = `g${gamepad.index}-lr-dpad-left`;
        const dpadRightKey = `g${gamepad.index}-lr-dpad-right`;
        const wasDpadLeft = prevLrAxisActiveRef.current.get(dpadLeftKey) ?? false;
        const wasDpadRight = prevLrAxisActiveRef.current.get(dpadRightKey) ?? false;

        if (dpadLeft && !wasDpadLeft) {
          const total = LIGHTROOM_BASIC_SLIDERS.length;
          cycleTo((currentSliderIndexRef.current - 1 + total) % total);
        }
        if (dpadRight && !wasDpadRight) {
          const total = LIGHTROOM_BASIC_SLIDERS.length;
          cycleTo((currentSliderIndexRef.current + 1) % total);
        }

        prevLrAxisActiveRef.current.set(dpadLeftKey, dpadLeft);
        prevLrAxisActiveRef.current.set(dpadRightKey, dpadRight);

        // Left stick left/right adjusts the focused slider value
        const leftActive = stickX < -threshold;
        const rightActive = stickX > threshold;

        if (
          (leftActive || rightActive) &&
          !pendingSliderAdjustRef.current &&
          now - lastAdjustTimeRef.current > adjustRepeatMs
        ) {
          if (window.keySimulator) {
            pendingSliderAdjustRef.current = true;
            lastAdjustTimeRef.current = now;
            const key = rightActive ? "=" : "-";
            window.keySimulator
              .keyToggle(key, true)
              .then(() => window.keySimulator.keyToggle(key, false))
              .finally(() => { pendingSliderAdjustRef.current = false; });
          }
        }
      });

      // Hotkey mode (skip sticks handled by mouse or lightroom-sliders)
      const stickMappingsByStick = axisMappings.reduce(
        (acc, axisMapping) => {
          if (
            axisMapping.type === "hotkey" &&
            !sticksWithMouse.has(axisMapping.stickIndex) &&
            !sticksWithLrSliders.has(axisMapping.stickIndex)
          ) {
            acc.set(
              axisMapping.stickIndex,
              (acc.get(axisMapping.stickIndex) || []).concat(axisMapping)
            );
          }
          return acc;
        },
        new Map<number, AxisMapping[]>()
      );

      stickMappingsByStick.entries().forEach(([stickIndex, stickAxisMappings]) => {
        const { axisXIndex, axisYIndex } = getStickAxes(stickIndex);
        const stickX = gamepad.axes[axisXIndex] || 0;
        const stickY = gamepad.axes[axisYIndex] || 0;
        const configuredDirections = new Set(stickAxisMappings.map((m) => m.direction));

        Promise.all(
          stickAxisMappings.map((axisMapping) => {
            const stateKey = `gamepad-${gamepad.index}-axis-${axisMapping.stickIndex}-${axisMapping.direction}`;
            const detectedDirection = getStickDirection(stickX, stickY, axisMapping.threshold);
            let isActive = false;

            if (detectedDirection === axisMapping.direction) {
              isActive = true;
            } else if (detectedDirection && !configuredDirections.has(detectedDirection)) {
              const fallbacks = getFallbackDirections(detectedDirection);
              isActive = fallbacks.includes(axisMapping.direction);
            }

            return simulateKeyPress(axisMapping.key, isActive, stateKey);
          })
        );
      });
    });
  }, [gamepads, getMapping, getMouseMappings, simulateKeyPress, getFallbackDirections]);

  return {
    mappings,
    getMapping,
    getActiveMappings,
    setButtonMapping,
    setAxisMapping,
    setDpadMapping,
    removeButtonMapping,
    removeAxisMapping,
    removeDpadMapping,
    addProfile,
    removeProfile,
    setActiveProfile,
    addLightroomProfiles,
    currentLrSliderIndex,
    setCurrentLrSliderIndex,
    editingButton,
    setEditingButton,
    editingAxis,
    setEditingAxis,
    editingDpad,
    setEditingDpad,
  };
}
