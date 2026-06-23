export interface KeySimulator {
  keyToggle: (key: string, down: boolean) => Promise<{ success: boolean; error?: string }>
}

export interface MouseSimulator {
  moveMouse: (deltaX: number, deltaY: number) => Promise<{ success: boolean; error?: string }>
  buttonToggle: (button: string, down: boolean) => Promise<{ success: boolean; error?: string }>
  clickAt: (x: number, y: number) => Promise<{ success: boolean; error?: string }>
}

export interface IpcRenderer {
  on(channel: string, listener: (event: any, ...args: any[]) => void): void
  off(channel: string, listener: (...args: any[]) => void): void
  send(channel: string, ...args: any[]): void
  invoke(channel: string, ...args: any[]): Promise<any>
}

export interface AppleScriptBridge {
  run: (script: string) => Promise<{ success: boolean; result?: string; error?: string }>
}

export interface HudBridge {
  show: (title: string, body?: string) => void
}

declare global {
  interface Window {
    keySimulator: KeySimulator
    mouseSimulator?: MouseSimulator
    ipcRenderer?: IpcRenderer
    appleScript?: AppleScriptBridge
    hud?: HudBridge
  }
}

