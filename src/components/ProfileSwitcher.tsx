import { GamepadMapping, GamepadProfile } from "../hooks/useGamepadMapping";
import type { LightroomModuleState } from "../hooks/useLightroomModule";

interface ProfileSwitcherProps {
  mapping: GamepadMapping | undefined;
  lightroomState: LightroomModuleState;
  onAddLightroomProfiles: () => void;
  onSelectProfile: (profileId: string) => void;
  onRemoveProfile: (profileId: string) => void;
}

export function ProfileSwitcher({
  mapping,
  lightroomState,
  onAddLightroomProfiles,
  onSelectProfile,
  onRemoveProfile,
}: ProfileSwitcherProps) {
  const profiles = mapping?.profiles ?? [];
  const activeProfileId = mapping?.activeProfileId ?? "";

  const hasLrLibrary = profiles.some((p) => p.name === "LR Library");
  const hasLrDevelop = profiles.some((p) => p.name === "LR Develop");
  const hasLrProfiles = hasLrLibrary && hasLrDevelop;

  return (
    <div className="profile-switcher">
      <div className="profile-switcher-header">
        <span className="profile-switcher-title">Profiles</span>
        {lightroomState.isLightroomFrontmost && (
          <span
            className={`lr-badge lr-badge--${lightroomState.module ?? "unknown"}`}
            title={`Lightroom: ${lightroomState.module ?? "unknown module"}`}
          >
            LR {lightroomState.module ?? "..."}
          </span>
        )}
      </div>

      <div className="profile-list">
        {/* Default profile */}
        <button
          className={`profile-item ${activeProfileId === "" ? "profile-item--active" : ""}`}
          onClick={() => onSelectProfile("")}
        >
          <span className="profile-name">Default</span>
          {activeProfileId === "" && <span className="profile-active-dot" />}
        </button>

        {profiles.map((profile: GamepadProfile) => (
          <div key={profile.id} className="profile-row">
            <button
              className={`profile-item ${activeProfileId === profile.id ? "profile-item--active" : ""}`}
              onClick={() => onSelectProfile(profile.id)}
            >
              <span className="profile-name">{profile.name}</span>
              {activeProfileId === profile.id && (
                <span className="profile-active-dot" />
              )}
            </button>
            <button
              className="profile-delete"
              title={`Remove ${profile.name}`}
              onClick={(e) => {
                e.stopPropagation();
                onRemoveProfile(profile.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {!hasLrProfiles && (
        <button
          className="add-lr-profiles-btn"
          onClick={onAddLightroomProfiles}
          title="Add pre-configured Library and Develop profiles for Lightroom Classic"
        >
          + Add Lightroom Profiles
        </button>
      )}
    </div>
  );
}
