import React from 'react';
import { RefreshCw, Sparkles, X, CheckCircle2 } from 'lucide-react';
import { VersionInfo } from '../hooks/useAppUpdate.ts';

interface UpdateModalProps {
  isOpen: boolean;
  versionInfo: VersionInfo | null;
  onUpdate: () => void;
  onDismiss: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  versionInfo,
  onUpdate,
  onDismiss,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-cyan-500/30 p-6 shadow-2xl text-slate-100 relative">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          aria-label="Schließen"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-slate-950 shadow-lg shadow-cyan-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider font-bold text-cyan-400">
              Neue Version verfügbar
            </span>
            <h3 className="text-xl font-bold text-white">App aktualisieren</h3>
          </div>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/60 mb-5">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Version: {versionInfo?.version || '1.0.1'}</span>
            <span>Build: {versionInfo?.buildTime ? new Date(versionInfo.buildTime).toLocaleDateString() : 'Neuester Stand'}</span>
          </div>
          <p className="text-sm text-slate-200 leading-relaxed">
            {versionInfo?.changelog ||
              'Die App wurde weiterentwickelt: Verbesserte Spracherkennung für Autofahrten, optimierte Gemini-Rückmeldungen und schnellere Ladezeiten.'}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Deine Einstellungen und bisherigen Lernstatistiken bleiben erhalten.</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={onUpdate}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-[0.98] transition cursor-pointer"
          >
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Jetzt aktualisieren & neu laden</span>
          </button>

          <button
            onClick={onDismiss}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-slate-200 transition text-center"
          >
            Später erinnern
          </button>
        </div>
      </div>
    </div>
  );
};
