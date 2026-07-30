// ─────────────────────────────────────────────────────────────
// Storage manager for Chrome Extension user settings
// Uses chrome.storage.local with safe fallback for dev environments
// ─────────────────────────────────────────────────────────────

export interface UserSettings {
  backendUrl: string;
  model: string;
  openRouterApiKey: string;
}

export const DEFAULT_SETTINGS: UserSettings = {
  backendUrl: "http://localhost:3000/api/analyze",
  model: "anthropic/claude-3-5-sonnet",
  openRouterApiKey: "",
};

export const AVAILABLE_MODELS = [
  { id: "anthropic/claude-3-5-sonnet", name: "Claude 3.5 Sonnet (Recommended)" },
  { id: "openai/gpt-4o", name: "GPT-4o (High Speed & Precision)" },
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash (Fast & Low Cost)" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Advanced Reasoning)" },
];

/** Retrieve user settings from chrome.storage.local or return defaults */
export async function getSettings(): Promise<UserSettings> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(DEFAULT_SETTINGS, (result) => {
        resolve({
          backendUrl: result.backendUrl || DEFAULT_SETTINGS.backendUrl,
          model: result.model || DEFAULT_SETTINGS.model,
          openRouterApiKey: result.openRouterApiKey || DEFAULT_SETTINGS.openRouterApiKey,
        });
      });
    } else {
      // Fallback for non-extension environment / dev mode
      const storedUrl = localStorage.getItem("speedinvest_backendUrl");
      const storedModel = localStorage.getItem("speedinvest_model");
      const storedKey = localStorage.getItem("speedinvest_openRouterApiKey");
      resolve({
        backendUrl: storedUrl || DEFAULT_SETTINGS.backendUrl,
        model: storedModel || DEFAULT_SETTINGS.model,
        openRouterApiKey: storedKey || DEFAULT_SETTINGS.openRouterApiKey,
      });
    }
  });
}

/** Save updated user settings to storage */
export async function saveSettings(settings: UserSettings): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set(settings, () => {
        resolve();
      });
    } else {
      localStorage.setItem("speedinvest_backendUrl", settings.backendUrl);
      localStorage.setItem("speedinvest_model", settings.model);
      localStorage.setItem("speedinvest_openRouterApiKey", settings.openRouterApiKey);
      resolve();
    }
  });
}
