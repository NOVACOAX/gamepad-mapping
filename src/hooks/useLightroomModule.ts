import { useEffect, useRef, useState } from "react";

export type LightroomModule = "library" | "develop" | "map" | "book" | "slideshow" | "print" | "web" | null;

export interface LightroomModuleState {
  isLightroomFrontmost: boolean;
  module: LightroomModule;
}

const POLL_INTERVAL_MS = 1000;

const FRONTMOST_APP_SCRIPT =
  'tell application "System Events" to get name of first application process whose frontmost is true';

// LR 14+ removed "current module" from the scripting dictionary.
// Fallback: Develop has 10+ sliders visible; Library has <8.
const LIGHTROOM_MODULE_SCRIPT = `
try
  -- Works on LR Classic <= ~13
  tell application "Adobe Lightroom Classic"
    return (current module) as string
  end tell
on error
end try
-- Fallback: count sliders in the full UI tree
tell application "System Events"
  tell process "Adobe Lightroom Classic"
    try
      set allSliders to every slider of entire contents of window 1
      set cnt to count of allSliders
      if cnt >= 8 then
        return "develop"
      else
        return "library"
      end if
    on error
      return ""
    end try
  end tell
end tell
`;

function parseModule(raw: string): LightroomModule {
  const s = raw.toLowerCase().trim();
  if (s === "library") return "library";
  if (s === "develop") return "develop";
  if (s === "map") return "map";
  if (s === "book") return "book";
  if (s === "slideshow") return "slideshow";
  if (s === "print") return "print";
  if (s === "web") return "web";
  // Fall back: try to find a module keyword anywhere in the string
  for (const m of ["library", "develop", "map", "book", "slideshow", "print", "web"] as LightroomModule[]) {
    if (m && s.includes(m)) return m;
  }
  return null;
}

export function useLightroomModule(): LightroomModuleState {
  const [state, setState] = useState<LightroomModuleState>({
    isLightroomFrontmost: false,
    module: null,
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    if (!window.appleScript) return;

    let cancelled = false;

    async function poll() {
      if (cancelled) return;

      try {
        const appResult = await window.appleScript!.run(FRONTMOST_APP_SCRIPT);
        if (cancelled) return;

        const frontmostApp = appResult.result ?? "";
        const isLightroomFrontmost =
          frontmostApp.toLowerCase().includes("lightroom");

        if (!isLightroomFrontmost) {
          if (stateRef.current.isLightroomFrontmost || stateRef.current.module !== null) {
            setState({ isLightroomFrontmost: false, module: null });
          }
          return;
        }

        // LR is frontmost — detect module
        const modResult = await window.appleScript!.run(LIGHTROOM_MODULE_SCRIPT);
        if (cancelled) return;

        const module = modResult.success
          ? parseModule(modResult.result ?? "")
          : null;

        const prev = stateRef.current;
        if (prev.isLightroomFrontmost !== isLightroomFrontmost || prev.module !== module) {
          setState({ isLightroomFrontmost, module });
        }
      } catch {
        // Silently ignore polling errors (LR may not be running)
      }
    }

    const id = setInterval(poll, POLL_INTERVAL_MS);
    poll(); // run immediately on mount

    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return state;
}
