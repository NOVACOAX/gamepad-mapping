import { useState, useEffect, useRef, useCallback } from "react";
import { GamepadState } from "../hooks/useGamepad";
import { GamepadMapping, StickDirection, StickMappingType } from "../hooks/useGamepadMapping";
import { StickHotkeyMode } from "./StickHotkeyMode";
import { StickMouseMode } from "./StickMouseMode";
import { KeyMappingSelector } from "./KeyMappingSelector";
import { MappingActions } from "./MappingPanel";
import { getSticks, getButtonConfig } from "../constants/controllerMappings";
import { LIGHTROOM_BASIC_SLIDERS } from "../constants/lightroomSliders";
import "./MappingPanel.css";

interface StickMappingPanelProps {
  gamepad: GamepadState;
  mapping?: GamepadMapping;
  stickIndex: number;
  editingAxis: {
    gamepadIndex: number;
    stickIndex: number;
    direction: StickDirection;
  } | null;
  editingButton: { gamepadIndex: number; buttonIndex: number } | null;
  onSetAxisMapping: (
    stickIndex: number,
    direction: StickDirection,
    key: string,
    label: string,
    threshold: number,
    type?: StickMappingType,
    sensitivity?: number,
    acceleration?: number,
    invertX?: boolean,
    invertY?: boolean
  ) => void;
  onRemoveAxisMapping: (stickIndex: number, direction: StickDirection) => void;
  onSetEditingAxis: (
    value: {
      gamepadIndex: number;
      stickIndex: number;
      direction: StickDirection;
    } | null
  ) => void;
  onSetButtonMapping: (buttonIndex: number, key: string, label: string) => void;
  onRemoveButtonMapping: (buttonIndex: number) => void;
  onSetEditingButton: (
    value: { gamepadIndex: number; buttonIndex: number } | null
  ) => void;
}

export function StickMappingPanel({
  gamepad,
  mapping,
  stickIndex,
  editingAxis,
  editingButton,
  onSetAxisMapping,
  onRemoveAxisMapping,
  onSetEditingAxis,
  onSetButtonMapping,
  onRemoveButtonMapping,
  onSetEditingButton,
}: StickMappingPanelProps) {
  const [mappingType, setMappingType] = useState<StickMappingType>("hotkey");
  const previousMappingTypeRef = useRef<StickMappingType | null>(null);

  const stickMappings =
    mapping?.axisMappings.filter((m) => m.stickIndex === stickIndex) || [];
  const mouseMapping = stickMappings.find((m) => m.type === "mouse");
  const lrSliderMapping = stickMappings.find((m) => m.type === "lightroom-sliders");
  const isMouseMode = (mouseMapping !== undefined || mappingType === "mouse") && !lrSliderMapping;
  const isLrSlidersMode = lrSliderMapping !== undefined;

  // Sync mapping type with existing mappings
  useEffect(() => {
    if (lrSliderMapping) {
      setMappingType("lightroom-sliders");
      previousMappingTypeRef.current = "lightroom-sliders";
    } else if (mouseMapping) {
      setMappingType("mouse");
      previousMappingTypeRef.current = "mouse";
    } else {
      setMappingType("hotkey");
    }
  }, [mouseMapping, lrSliderMapping]);

  const removeAllStickMappings = (stickIndex: number) => {
    const stickMappings =
      mapping?.axisMappings.filter((m) => m.stickIndex === stickIndex) || [];
    stickMappings.forEach((m) => {
      onRemoveAxisMapping(stickIndex, m.direction);
    });
  };

  // Get stick button index (10 for left stick, 11 for right stick)
  const stickButtonIndex = getSticks(gamepad.mapping).find(
    (s) => s.index === stickIndex
  )?.buttonIndex;
  
  const stickButton = stickButtonIndex !== undefined ? gamepad.buttons[stickButtonIndex] : null;
  const stickButtonMapping = stickButtonIndex !== undefined
    ? mapping?.buttonMappings.find((m) => m.buttonIndex === stickButtonIndex)
    : null;
  const isEditingStickButton = editingButton?.buttonIndex === stickButtonIndex;
  const [pendingStickButtonKey, setPendingStickButtonKey] = useState<{
    key: string;
    label: string;
  } | null>(null);
  const [hasUnsavedStickButtonChanges, setHasUnsavedStickButtonChanges] = useState(false);

  const handleStickButtonKeyPress = useCallback(
    (key: string, label: string) => {
      setPendingStickButtonKey({ key, label });
      setHasUnsavedStickButtonChanges(true);
    },
    []
  );

  const handleStickButtonApply = useCallback(() => {
    if (pendingStickButtonKey && stickButtonIndex !== undefined) {
      onSetButtonMapping(
        stickButtonIndex,
        pendingStickButtonKey.key,
        pendingStickButtonKey.label
      );
      setPendingStickButtonKey(null);
      setHasUnsavedStickButtonChanges(false);
      onSetEditingButton(null);
    }
  }, [
    pendingStickButtonKey,
    stickButtonIndex,
    onSetButtonMapping,
    onSetEditingButton,
  ]);

  const handleStickButtonRevert = useCallback(() => {
    setPendingStickButtonKey(null);
    setHasUnsavedStickButtonChanges(false);
    onSetEditingButton(null);
  }, [onSetEditingButton]);

  const getButtonLabel = (index: number) => {
    const config = getButtonConfig(index, gamepad.mapping);
    return config?.label || `Button ${index}`;
  };

  return (
    <div className="mapping-panel-content">
      <div className="mapping-header">
        <h3>{stickIndex === 0 ? "Left" : "Right"} Stick</h3>
        <p className="panel-subtitle">Configure stick mapping</p>
      </div>

      {/* Stick Button Mapping */}
      {stickButtonIndex !== undefined && (
        <div className="stick-button-mapping-section">
          <h4 className="mappings-section-title">
            Stick Button ({stickIndex === 0 ? "LS" : "RS"})
          </h4>
          <div className="stick-directions-list">
            <div
              className={`button-mapping-item ${
                stickButtonMapping ? "has-mapping" : ""
              } ${stickButton?.pressed ? "active" : ""} ${
                isEditingStickButton ? "editing" : ""
              }`}
              onClick={() => {
                if (!isEditingStickButton) {
                  setPendingStickButtonKey(null);
                  setHasUnsavedStickButtonChanges(false);
                  onSetEditingButton({
                    gamepadIndex: gamepad.index,
                    buttonIndex: stickButtonIndex,
                  });
                }
              }}
            >
              <div className="direction-label">{getButtonLabel(stickButtonIndex)}</div>
              <KeyMappingSelector
                currentMapping={
                  stickButtonMapping
                    ? {
                        key: stickButtonMapping.key,
                        label: stickButtonMapping.label,
                      }
                    : null
                }
                isEditing={isEditingStickButton}
                pendingKey={pendingStickButtonKey}
                onKeyPress={handleStickButtonKeyPress}
                onRemove={() => {
                  onRemoveButtonMapping(stickButtonIndex);
                  setHasUnsavedStickButtonChanges(false);
                  setPendingStickButtonKey(null);
                }}
                showRemove={!!stickButtonMapping || !!pendingStickButtonKey}
              />
              {stickButton?.pressed && (
                <span className="active-indicator">●</span>
              )}
            </div>
          </div>

          {isEditingStickButton && (
            <div className="editing-hint">
              {pendingStickButtonKey ? (
                <div>
                  New mapping: <strong>{pendingStickButtonKey.label}</strong>{" "}
                  (press Apply Changes to save)
                </div>
              ) : (
                <div>
                  Press a keyboard key or click a mouse button to map...
                </div>
              )}
            </div>
          )}

          <MappingActions
            hasUnsavedChanges={hasUnsavedStickButtonChanges && isEditingStickButton}
            onApplyChanges={handleStickButtonApply}
            onRevertChanges={handleStickButtonRevert}
            onRemoveMapping={() => {
              onRemoveButtonMapping(stickButtonIndex);
              setHasUnsavedStickButtonChanges(false);
              setPendingStickButtonKey(null);
            }}
            showRemove={!!stickButtonMapping || !!pendingStickButtonKey}
          />
        </div>
      )}

      {/* Mode selector */}
      {!isLrSlidersMode && (
        <div className="mapping-mode-selector">
          <label>Mapping Mode:</label>
          <div className="mode-buttons">
            <button
              className={`mode-button ${!isMouseMode ? "active" : ""}`}
              onClick={() => {
                if (mouseMapping) {
                  onRemoveAxisMapping(stickIndex, mouseMapping.direction);
                }
                previousMappingTypeRef.current = mappingType;
                setMappingType("hotkey");
                if (editingAxis?.stickIndex === stickIndex) {
                  onSetEditingAxis(null);
                }
              }}
            >
              8 Directions (Hotkeys)
            </button>
            <button
              className={`mode-button ${isMouseMode ? "active" : ""}`}
              onClick={() => {
                if (!mouseMapping) {
                  stickMappings.forEach((m) => {
                    if (m.type !== "mouse") {
                      onRemoveAxisMapping(stickIndex, m.direction);
                    }
                  });
                  previousMappingTypeRef.current = mappingType;
                  setMappingType("mouse");
                  if (editingAxis?.stickIndex === stickIndex) {
                    onSetEditingAxis(null);
                  }
                }
              }}
            >
              Mouse Control
            </button>
          </div>
        </div>
      )}

      {isLrSlidersMode ? (
        <div className="lr-sliders-info">
          <div className="lr-sliders-header">
            <span className="lr-sliders-badge">LR Basic Sliders</span>
            <button
              className="lr-sliders-clear"
              title="Remove LR Sliders mode"
              onClick={() => {
                stickMappings.forEach((m) =>
                  onRemoveAxisMapping(stickIndex, m.direction)
                );
                setMappingType("hotkey");
              }}
            >
              ×
            </button>
          </div>
          <p className="lr-sliders-desc">
            Up/Down cycles sliders · Left/Right adjusts value
          </p>
          <div className="lr-sliders-list">
            {LIGHTROOM_BASIC_SLIDERS.map((name, i) => (
              <span key={name} className="lr-slider-chip">
                {i + 1}. {name}
              </span>
            ))}
          </div>
        </div>
      ) : isMouseMode ? (
        <StickMouseMode
          mapping={mapping}
          stickIndex={stickIndex}
          onSetAxisMapping={onSetAxisMapping}
          onRemoveAxisMapping={onRemoveAxisMapping}
          previousMappingType={previousMappingTypeRef.current}
        />
      ) : (
        <StickHotkeyMode
          gamepad={gamepad}
          mapping={mapping}
          stickIndex={stickIndex}
          editingAxis={editingAxis}
          onSetAxisMapping={onSetAxisMapping}
          onRemoveAxisMapping={onRemoveAxisMapping}
          onSetEditingAxis={onSetEditingAxis}
          onRemoveAllMappings={removeAllStickMappings}
        />
      )}
    </div>
  );
}
