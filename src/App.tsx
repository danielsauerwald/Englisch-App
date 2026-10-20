/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { SetupScreen } from './components/SetupScreen.tsx';
import { CarModeScreen } from './components/CarModeScreen.tsx';
import { EvaluationModal } from './components/EvaluationModal.tsx';
import { DashboardScreen } from './components/DashboardScreen.tsx';
import { UpdateModal } from './components/UpdateModal.tsx';
import {
  UserSettings,
  ConversationMessage,
  SessionReport,
  LearningStats,
} from './types/index.ts';
import { storageService, DEFAULT_SETTINGS } from './services/storageService.ts';
import { useAppUpdate } from './hooks/useAppUpdate.ts';
import { geminiClientService } from './services/geminiClientService.ts';

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'setup' | 'car' | 'dashboard'>('setup');

  // Stored state
  const [settings, setSettings] = useState<UserSettings>(() => storageService.loadSettings());
  const [stats, setStats] = useState<LearningStats>(() => storageService.loadStats());

  // Evaluation state
  const [evaluationReport, setEvaluationReport] = useState<SessionReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [evalError, setEvalError] = useState<string | null>(null);

  // App Update Hook
  const {
    currentVersion,
    updateAvailable,
    newVersionInfo,
    isChecking,
    checkStatus,
    checkForUpdates,
    performUpdate,
    dismissUpdate,
  } = useAppUpdate();

  // Save settings on update
  const handleSaveSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // Reload stats from storage
  const handleRefreshStats = () => {
    setStats(storageService.loadStats());
  };

  // Start Car Drive
  const handleStartDrive = () => {
    setCurrentTab('car');
  };

  // Finish Car Drive & trigger AI Evaluation
  const handleFinishSession = async (
    messages: ConversationMessage[],
    durationMinutes: number
  ) => {
    setIsEvaluating(true);
    setCurrentTab('setup'); // Reset base tab behind modal

    const topicLabel =
      settings.topicMode === 'news'
        ? 'Tagesaktuelle News & Politik'
        : settings.topicMode === 'business'
        ? 'Wirtschaft & Finanzen'
        : settings.topicMode === 'society'
        ? 'Gesellschaft & Alltag'
        : settings.topicMode === 'custom'
        ? settings.customTopic || 'Individuelles Thema'
        : 'Zufälliges Gesprächsthema';

    try {
      setEvalError(null);
      const evalData = await geminiClientService.evaluate({
        messages,
        level: settings.level,
        topic: topicLabel,
        durationMinutes,
      });

      const newReport: SessionReport = {
        id: `session-${Date.now()}`,
        date: new Date().toISOString(),
        durationMinutes,
        level: settings.level,
        topic: topicLabel,
        grammarScore: evalData.grammarScore ?? 80,
        vocabScore: evalData.vocabScore ?? 78,
        fluencyScore: evalData.fluencyScore ?? 85,
        overallScore: evalData.overallScore ?? 81,
        feedbackSummary:
          evalData.feedbackSummary ||
          'Tolle Fahrt! Du hast dich flüssig und selbstbewusst auf Englisch unterhalten.',
        corrections: (evalData.corrections || []).map((c, i) => ({
          id: `corr-${Date.now()}-${i}`,
          userSaid: c.userSaid,
          betterWay: c.betterWay,
          explanationDe: c.explanationDe,
          date: new Date().toISOString(),
        })),
        vocabularyHarvest: (evalData.vocabularyHarvest || []).map((v, i) => ({
          id: `vocab-${Date.now()}-${i}`,
          english: v.english,
          german: v.german,
          exampleSentence: v.exampleSentence,
          cefrLevel: (v.cefrLevel || 'B1') as any,
          savedAt: new Date().toISOString(),
          mastered: false,
        })),
        messagesCount: messages.length,
      };

      // Save to localStorage
      const updatedStats = storageService.addSessionReport(newReport);
      setStats(updatedStats);
      setEvaluationReport(newReport);
    } catch (err: any) {
      console.error('Failed to evaluate session with Gemini:', err);
      setEvalError(err.message || String(err));
    } finally {
      setIsEvaluating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header (suppressed in active Car Mode for zero-distraction view) */}
      {currentTab !== 'car' && (
        <Header
          currentTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
          version={currentVersion}
          onCheckUpdate={() => checkForUpdates(true)}
          isCheckingUpdate={isChecking}
          checkStatus={checkStatus}
        />
      )}

      {/* Main Screens */}
      <main className="flex-1">
        {currentTab === 'setup' && (
          <SetupScreen
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onStartDrive={handleStartDrive}
          />
        )}

        {currentTab === 'car' && (
          <CarModeScreen
            settings={settings}
            onFinishSession={handleFinishSession}
            onExitWithoutSave={() => setCurrentTab('setup')}
          />
        )}

        {currentTab === 'dashboard' && (
          <DashboardScreen
            stats={stats}
            onRefreshStats={handleRefreshStats}
            onStartNewDrive={() => setCurrentTab('setup')}
          />
        )}
      </main>

      {/* Post-Drive Evaluation Modal */}
      {(evaluationReport || isEvaluating || evalError) && (
        <EvaluationModal
          report={evaluationReport}
          isLoading={isEvaluating}
          errorMessage={evalError}
          onGoToDashboard={() => {
            setEvaluationReport(null);
            setEvalError(null);
            setCurrentTab('dashboard');
          }}
          onNewDrive={() => {
            setEvaluationReport(null);
            setEvalError(null);
            setCurrentTab('setup');
          }}
        />
      )}

      {/* Automatic Update Detection Modal */}
      <UpdateModal
        isOpen={updateAvailable}
        versionInfo={newVersionInfo}
        onUpdate={performUpdate}
        onDismiss={dismissUpdate}
      />
    </div>
  );
}
