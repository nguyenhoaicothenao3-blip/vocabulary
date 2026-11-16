import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { SetupScreen } from './components/SetupScreen';
import { SummaryScreen } from './components/SummaryScreen';
import {
  AppScreen,
  DEFAULT_GAME_SETTINGS,
  GameResult,
  GameSettings,
  STARTER_VOCAB,
  VocabWord,
} from './types/vocab';

const STORAGE_KEY = 'vocab_shooter_words_v1';
const SETTINGS_STORAGE_KEY = 'vocab_shooter_settings_v1';

function loadInitialWords(): VocabWord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return STARTER_VOCAB;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is VocabWord =>
          typeof item?.id === 'string' &&
          typeof item?.english === 'string' &&
          typeof item?.vietnamese === 'string'
      );
    }
  } catch {
    // Fallback to starter vocab if storage is unavailable
  }
  return STARTER_VOCAB;
}

function loadInitialSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_GAME_SETTINGS;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const mode = parsed.mode === 'medium' ? 'medium' : 'easy';
      const fallLanguage =
        parsed.fallLanguage === 'en' || parsed.fallLanguage === 'random'
          ? parsed.fallLanguage
          : 'vi';
      const mediumHearts =
        typeof parsed.mediumHearts === 'number'
          ? Math.max(1, Math.min(10, Math.round(parsed.mediumHearts)))
          : DEFAULT_GAME_SETTINGS.mediumHearts;
      const mediumSpeedMultiplier =
        typeof parsed.mediumSpeedMultiplier === 'number'
          ? Math.max(1.2, Math.min(2.5, Number(parsed.mediumSpeedMultiplier.toFixed(1))))
          : DEFAULT_GAME_SETTINGS.mediumSpeedMultiplier;
      return { mode, fallLanguage, mediumHearts, mediumSpeedMultiplier };
    }
  } catch {
    // Ignore parse errors
  }
  return DEFAULT_GAME_SETTINGS;
}

export default function App() {
  const [words, setWords] = useState<VocabWord[]>(loadInitialWords);
  const [settings, setSettings] = useState<GameSettings>(loadInitialSettings);
  const [screen, setScreen] = useState<AppScreen>('SETUP');
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [sessionKey, setSessionKey] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
    } catch {
      // Ignore storage quota errors
    }
  }, [words]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors
    }
  }, [settings]);

  const handleAddWord = (english: string, vietnamese: string) => {
    const newWord: VocabWord = {
      id: `word-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      english,
      vietnamese,
    };
    setWords((prev) => [newWord, ...prev]);
  };

  const handleAddWordsBulk = (
    entries: Array<{ english: string; vietnamese: string }>
  ): { addedCount: number; duplicateCount: number } => {
    const existingLower = new Set(words.map((w) => w.english.toLowerCase()));
    const newItems: VocabWord[] = [];
    let duplicateCount = 0;
    const baseTime = Date.now();

    entries.forEach((entry, idx) => {
      const cleanEn = entry.english.trim().replace(/\s+/g, ' ');
      const cleanVi = entry.vietnamese.trim().replace(/\s+/g, ' ');
      if (!cleanEn || !cleanVi) return;

      const key = cleanEn.toLowerCase();
      if (existingLower.has(key)) {
        duplicateCount += 1;
        return;
      }
      existingLower.add(key);
      newItems.push({
        id: `word-${baseTime}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
        english: cleanEn,
        vietnamese: cleanVi,
      });
    });

    if (newItems.length > 0) {
      setWords((prev) => [...newItems, ...prev]);
    }

    return { addedCount: newItems.length, duplicateCount };
  };

  const handleDeleteWord = (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleClearAll = () => {
    setWords([]);
  };

  const handleLoadStarter = () => {
    setWords((prev) => {
      const existingLower = new Set(prev.map((w) => w.english.toLowerCase()));
      const additions = STARTER_VOCAB.filter(
        (s) => !existingLower.has(s.english.toLowerCase())
      );
      return [...prev, ...additions];
    });
  };

  const handleStartGame = () => {
    if (words.length === 0) return;
    setGameResult(null);
    setSessionKey((k) => k + 1);
    setScreen('PLAYING');
  };

  const handleFinishGame = (result: GameResult) => {
    setGameResult(result);
    setScreen('SUMMARY');
  };

  const handlePlayAgain = () => {
    setGameResult(null);
    setSessionKey((k) => k + 1);
    setScreen('PLAYING');
  };

  const handleBackToSetup = () => {
    setScreen('SETUP');
  };

  if (screen === 'PLAYING') {
    return (
      <GameScreen
        key={sessionKey}
        words={words}
        settings={settings}
        onFinishGame={handleFinishGame}
        onExitToSetup={handleBackToSetup}
      />
    );
  }

  if (screen === 'SUMMARY' && gameResult) {
    return (
      <SummaryScreen
        result={gameResult}
        onPlayAgain={handlePlayAgain}
        onBackToSetup={handleBackToSetup}
      />
    );
  }

  return (
    <SetupScreen
      words={words}
      settings={settings}
      onUpdateSettings={setSettings}
      onAddWord={handleAddWord}
      onAddWordsBulk={handleAddWordsBulk}
      onDeleteWord={handleDeleteWord}
      onClearAll={handleClearAll}
      onLoadStarter={handleLoadStarter}
      onStartGame={handleStartGame}
    />
  );
}
