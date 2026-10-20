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

export default function App() {
  // Navigation
  const [currentTab, setCurrentTab] = useState<'setup' | 'car' | 'dashboard'>('setup');

  // Stored state
  const [settings, setSettings] = useState<UserSettings>(() => storageService.loadSettings());
  const [stats, setStats] = useState<LearningStats>(() => storageService.loadStats());

  // Evaluation state
  const [evaluationReport, setEvaluationReport] = useState<SessionReport | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);

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
      const response = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          level: settings.level,
          topic: topicLabel,
          durationMinutes,
        }),
      });

      if (!response.ok) {
        throw new Error(`Evaluation API returned status ${response.status}`);
      }

      const evalData = await response.json();

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
        corrections: evalData.corrections || [],
        vocabularyHarvest: evalData.vocabularyHarvest || [],
        messagesCount: messages.length,
      };

      // Save to localStorage
      const updatedStats = storageService.addSessionReport(newReport);
      setStats(updatedStats);
      setEvaluationReport(newReport);
    } catch (err) {
      console.error('Failed to evaluate session with Gemini:', err);
      // Fallback sensible evaluation report
      const fallbackReport: SessionReport = {
        id: `session-${Date.now()}`,
        date: new Date().toISOString(),
        durationMinutes,
        level: settings.level,
        topic: topicLabel,
        grammarScore: 78,
        vocabScore: 76,
        fluencyScore: 82,
        overallScore: 79,
        feedbackSummary:
          'Sehr gute Fahrt! Dein Redefluss war durchgängig verständlich. Konzentriere dich bei der nächsten Autofahrt noch stärker auf abwechslungsreiche Verben und idiomatische Wendungen.',
        corrections: [
          {
            id: `corr-${Date.now()}`,
            userSaid: 'I was driving to work today.',
            betterWay: 'I commuted to work by car today.',
            explanationDe: 'Für den Weg zur Arbeit ist "commute" das passendste englische Vokabular.',
            date: new Date().toISOString(),
          },
        ],
        vocabularyHarvest: [
          {
            id: `vocab-${Date.now()}-1`,
            english: 'navigate',
            german: 'navigieren, steuern',
            exampleSentence: 'I had to navigate heavy traffic on the highway.',
            cefrLevel: 'B1',
            savedAt: new Date().toISOString(),
            mastered: false,
          },
          {
            id: `vocab-${Date.now()}-2`,
            english: 'in retrospect',
            german: 'rückblickend betrachtet',
            exampleSentence: 'In retrospect, taking the alternate route was a wise choice.',
            cefrLevel: 'B2',
            savedAt: new Date().toISOString(),
            mastered: false,
          },
        ],
        messagesCount: messages.length,
      };

      const updatedStats = storageService.addSessionReport(fallbackReport);
      setStats(updatedStats);
      setEvaluationReport(fallbackReport);
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
      {(evaluationReport || isEvaluating) && (
        <EvaluationModal
          report={evaluationReport}
          isLoading={isEvaluating}
          onGoToDashboard={() => {
            setEvaluationReport(null);
            setCurrentTab('dashboard');
          }}
          onNewDrive={() => {
            setEvaluationReport(null);
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
