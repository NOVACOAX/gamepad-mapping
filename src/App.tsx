import UpdateElectron from "@/components/update";
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";
import {
  ControllerVisualization,
  SelectedControl,
} from "./components/ControllerVisualization";
import { DeviceList } from "./components/DeviceList";
import { MappingPanel } from "./components/MappingPanel";
import { LrSliderSelector } from "./components/LrSliderSelector";
import { ProfileSwitcher } from "./components/ProfileSwitcher";
import { useGamepad } from "./hooks/useGamepad";
import { useGamepadMapping } from "./hooks/useGamepadMapping";
import { useLightroomModule } from "./hooks/useLightroomModule";
import {
  LIGHTROOM_DEVELOP_PROFILE,
  LIGHTROOM_LIBRARY_PROFILE,
} from "./data/lightroomProfiles";

function App() {
  const gamepads = useGamepad();
  const {
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
  } = useGamepadMapping(gamepads);

  const lightroomState = useLightroomModule();

  const [selectedGamepadIndex, setSelectedGamepadIndex] = useState<
    number | null
  >(null);
  const [selectedControl, setSelectedControl] = useState<SelectedControl>(null);

  // Auto-select first gamepad
  useEffect(() => {
    if (gamepads.length > 0 && selectedGamepadIndex === null) {
      setSelectedGamepadIndex(gamepads[0].index);
    } else if (gamepads.length === 0) {
      setSelectedGamepadIndex(null);
      setSelectedControl(null);
    }
  }, [gamepads, selectedGamepadIndex]);

  // Auto-switch profile when Lightroom module changes
  const lastLrModule = useRef<string | null>(null);
  useEffect(() => {
    const { isLightroomFrontmost, module } = lightroomState;
    if (!isLightroomFrontmost || selectedGamepadIndex === null) return;

    const moduleKey = module ?? "";
    if (moduleKey === lastLrModule.current) return;
    lastLrModule.current = moduleKey;

    const mapping = getMapping(selectedGamepadIndex);
    if (!mapping) return;

    if (module === "library") {
      const libraryProfile = mapping.profiles.find((p) => p.name === "LR Library");
      if (libraryProfile) setActiveProfile(selectedGamepadIndex, libraryProfile.id);
    } else if (module === "develop") {
      const developProfile = mapping.profiles.find((p) => p.name === "LR Develop");
      if (developProfile) setActiveProfile(selectedGamepadIndex, developProfile.id);
    }
  }, [lightroomState, selectedGamepadIndex, getMapping, setActiveProfile]);

  const selectedGamepad = gamepads.find(
    (g) => g.index === selectedGamepadIndex
  );
  const selectedMapping = selectedGamepad
    ? getMapping(selectedGamepad.index)
    : undefined;

  // Build a view of the mapping that reflects the active profile (for the visualization / mapping panel)
  const activeViewMapping = selectedMapping
    ? {
        ...selectedMapping,
        ...getActiveMappings(selectedMapping),
      }
    : undefined;

  const handleControlSelect = useCallback(
    (control: SelectedControl) => {
      setSelectedControl(control);
      setEditingButton(null);
      setEditingAxis(null);
    },
    [setEditingButton, setEditingAxis]
  );

  const handleSelectGamepad = (index: number) => {
    setSelectedGamepadIndex(index);
    setSelectedControl(null);
  };

  const handleAddLightroomProfiles = useCallback(() => {
    if (selectedGamepadIndex === null) return;
    addLightroomProfiles(
      selectedGamepadIndex,
      LIGHTROOM_LIBRARY_PROFILE as any,
      LIGHTROOM_DEVELOP_PROFILE as any
    );
  }, [selectedGamepadIndex, addLightroomProfiles]);

  const handleSelectProfile = useCallback(
    (profileId: string) => {
      if (selectedGamepadIndex === null) return;
      setActiveProfile(selectedGamepadIndex, profileId);
    },
    [selectedGamepadIndex, setActiveProfile]
  );

  // Show the slider selector when the active profile has LR slider mode on any stick
  const showSliderSelector = (() => {
    if (!selectedMapping) return false;
    const { axisMappings } = getActiveMappings(selectedMapping);
    return axisMappings.some((m) => m.type === "lightroom-sliders");
  })();

  const handleRemoveProfile = useCallback(
    (profileId: string) => {
      if (selectedGamepadIndex === null) return;
      removeProfile(selectedGamepadIndex, profileId);
    },
    [selectedGamepadIndex, removeProfile]
  );

  return (
    <div className="app">
      {gamepads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎮</div>
          <h1>No Gamepad Detected</h1>
          <p>Connect a controller and press any button to activate it.</p>
        </div>
      ) : (
        <div className="app-container">
          <aside className="device-panel">
            <DeviceList
              gamepads={gamepads}
              selectedGamepadIndex={selectedGamepadIndex}
              onSelectGamepad={handleSelectGamepad}
            />
            <ProfileSwitcher
              mapping={selectedMapping}
              lightroomState={lightroomState}
              onAddLightroomProfiles={handleAddLightroomProfiles}
              onSelectProfile={handleSelectProfile}
              onRemoveProfile={handleRemoveProfile}
            />
            {showSliderSelector && (
              <LrSliderSelector
                currentIndex={currentLrSliderIndex}
                onSelect={setCurrentLrSliderIndex}
              />
            )}
          </aside>

          <main className="visualization-panel">
            {selectedGamepad && (
              <>
                <div className="panel-header">
                  <h2>
                    {selectedGamepad.id.split("(")[0].trim() ||
                      `Gamepad ${selectedGamepad.index + 1}`}
                  </h2>
                  <p className="panel-subtitle">{selectedGamepad.id}</p>
                </div>
                <div className="visualization-content">
                  <ControllerVisualization
                    gamepad={selectedGamepad}
                    mapping={activeViewMapping}
                    selectedControl={selectedControl}
                    onControlSelect={handleControlSelect}
                  />
                </div>
              </>
            )}
          </main>

          <aside className="mapping-panel">
            <div className="panel-header">
              <h2>Mapping</h2>
            </div>
            <div className="mapping-content">
              {selectedGamepad ? (
                <MappingPanel
                  gamepad={selectedGamepad}
                  mapping={activeViewMapping}
                  selectedControl={selectedControl}
                  onSetButtonMapping={(buttonIndex, key, label) =>
                    setButtonMapping(
                      selectedGamepad.index,
                      buttonIndex,
                      key,
                      label
                    )
                  }
                  onSetAxisMapping={(
                    stickIndex,
                    direction,
                    key,
                    label,
                    threshold,
                    type,
                    sensitivity,
                    acceleration,
                    invertX,
                    invertY
                  ) =>
                    setAxisMapping(
                      selectedGamepad.index,
                      stickIndex,
                      direction,
                      key,
                      label,
                      threshold,
                      type,
                      sensitivity,
                      acceleration,
                      invertX,
                      invertY
                    )
                  }
                  onSetDpadMapping={(direction, key, label) =>
                    setDpadMapping(selectedGamepad.index, direction, key, label)
                  }
                  onRemoveButtonMapping={(buttonIndex) =>
                    removeButtonMapping(selectedGamepad.index, buttonIndex)
                  }
                  onRemoveAxisMapping={(stickIndex, direction) =>
                    removeAxisMapping(
                      selectedGamepad.index,
                      stickIndex,
                      direction
                    )
                  }
                  onRemoveDpadMapping={(direction) =>
                    removeDpadMapping(selectedGamepad.index, direction)
                  }
                  editingButton={editingButton}
                  editingAxis={editingAxis}
                  editingDpad={editingDpad}
                  onSetEditingButton={setEditingButton}
                  onSetEditingAxis={setEditingAxis}
                  onSetEditingDpad={setEditingDpad}
                  onSelectControl={handleControlSelect}
                />
              ) : (
                <div className="no-selection">
                  <div className="no-selection-icon">👆</div>
                  <p>
                    Click on a button or stick direction in the controller to
                    map it
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
      <UpdateElectron />
    </div>
  );
}

export default App;
