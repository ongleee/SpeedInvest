// ─────────────────────────────────────────────────────────────
// Settings Component — Modal form to configure API Key, backend, model
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from "react";
import { getSettings, saveSettings, AVAILABLE_MODELS, DEFAULT_SETTINGS } from "@/lib/storage";

interface SettingsProps {
  onBack: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onBack }) => {
  const [backendUrl, setBackendUrl] = useState(DEFAULT_SETTINGS.backendUrl);
  const [model, setModel] = useState(DEFAULT_SETTINGS.model);
  const [openRouterApiKey, setOpenRouterApiKey] = useState(DEFAULT_SETTINGS.openRouterApiKey);
  const [isSaved, setIsSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then((s) => {
      setBackendUrl(s.backendUrl);
      setModel(s.model);
      setOpenRouterApiKey(s.openRouterApiKey);
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveSettings({ backendUrl: backendUrl.trim(), model, openRouterApiKey: openRouterApiKey.trim() });
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onBack(); // Close modal after successful save
    }, 1000);
  };

  const handleResetDefaults = async () => {
    setBackendUrl(DEFAULT_SETTINGS.backendUrl);
    setModel(DEFAULT_SETTINGS.model);
    setOpenRouterApiKey(DEFAULT_SETTINGS.openRouterApiKey);
    await saveSettings(DEFAULT_SETTINGS);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
        <div className="flex flex-col items-center justify-center text-slate-400">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span className="text-xs font-mono">Loading configuration…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm flex flex-col font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/50">
          <h2 className="text-sm font-semibold tracking-wide text-white font-mono flex items-center gap-2">
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-slate-400">
              <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6-3.6z" />
            </svg>
            SETTINGS
          </h2>
          <button
            onClick={onBack}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-md hover:bg-slate-800"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-4 p-4">
          
          {/* OpenRouter API Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wider font-mono font-medium text-slate-400 flex justify-between">
              OpenRouter API Key
              {openRouterApiKey && <span className="text-emerald-400">Stored</span>}
            </label>
            <input
              type="password"
              value={openRouterApiKey}
              onChange={(e) => setOpenRouterApiKey(e.target.value)}
              placeholder="sk-or-v1-..."
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            <p className="text-[10px] text-slate-500 leading-tight">
              Stored locally on your device. Required for Catalyst scanning and APEX analysis.
            </p>
          </div>

          {/* Backend API Endpoint */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wider font-mono font-medium text-slate-400">
              Backend API Endpoint
            </label>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="http://localhost:3000/api/analyze"
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              required
            />
          </div>

          {/* AI Model Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-wider font-mono font-medium text-slate-400">
              OpenRouter AI Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-2 font-mono focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all cursor-pointer"
            >
              {AVAILABLE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="mt-2 pt-4 border-t border-slate-800/80 flex flex-col gap-2">
            {isSaved && (
              <div className="flex items-center justify-center gap-1.5 p-2 rounded bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 text-xs font-mono animate-fade-in">
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                Settings Saved Successfully!
              </div>
            )}

            <button
              type="submit"
              className="w-full py-2.5 rounded-lg font-mono font-semibold text-xs text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] transition-all shadow-[0_0_12px_rgba(52,211,153,0.2)]"
            >
              SAVE CONFIGURATION
            </button>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="w-full py-2 rounded-lg font-mono text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;
