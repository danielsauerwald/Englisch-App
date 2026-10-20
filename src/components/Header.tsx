import React from 'react';
import { Car, BarChart3, RefreshCw, Radio } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  currentTab: 'setup' | 'car' | 'dashboard';
  onSelectTab: (tab: 'setup' | 'dashboard') => void;
  version: string;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  checkStatus: string | null;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  version,
  onCheckUpdate,
  isCheckingUpdate,
  checkStatus,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-slate-950 shadow-md shadow-cyan-500/20">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
                  DriveEnglish
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400 border border-slate-700">
                  v{version}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-none mt-0.5">
                Freihändiger KI-Car-Trainer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {checkStatus && (
              <span className="hidden sm:inline-block text-xs font-medium text-cyan-300 animate-fade-in bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded-full">
                {checkStatus}
              </span>
            )}

            <button
              onClick={onCheckUpdate}
              disabled={isCheckingUpdate}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition active:scale-95"
              title="Auf App-Updates prüfen / Neu laden"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin text-cyan-400' : ''}`}
              />
            </button>

            <PWAInstallButton />
          </div>
        </div>

        {/* Tab switch buttons (only visible when not in active Car Mode) */}
        {currentTab !== 'car' && (
          <nav className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800/80">
            <button
              onClick={() => onSelectTab('setup')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'setup'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Fahrt starten (Setup)</span>
            </button>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Lernstatistik & Vokabelheft</span>
            </button>
          </nav>
        )}
      </div>
    </header>
  );
};
