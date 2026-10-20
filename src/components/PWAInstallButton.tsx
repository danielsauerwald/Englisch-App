import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30 transition shadow-sm"
        title="App auf Startbildschirm installieren"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Installieren</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium hover:bg-slate-700 transition"
          title="Auf iPhone/iPad installieren"
        >
          <Share2 className="w-3.5 h-3.5 text-cyan-400" />
          <span>iOS App</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-cyan-400" />
                  App auf dem iPhone installieren
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <p>
                    Tippe unten in der Safari-Symbolleiste auf das <strong>Teilen-Symbol</strong>{' '}
                    (Rechteck mit Pfeil nach oben).
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <p>
                    Scrolle in den Optionen nach unten und wähle{' '}
                    <strong className="text-cyan-300">"Zum Home-Bildschirm"</strong>{' '}
                    <PlusSquare className="inline w-4 h-4 ml-1 text-cyan-400" />.
                  </p>
                </div>

                <div className="flex items-start gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                  <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <p>
                    Tippe oben rechts auf <strong>"Hinzufügen"</strong>. Die App öffnet sich künftig
                    ohne Adressleiste im Vollbild!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-cyan-500 text-slate-950 font-semibold text-sm hover:bg-cyan-400 transition"
              >
                Verstanden
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
