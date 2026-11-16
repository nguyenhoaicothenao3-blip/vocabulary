import { useEffect, useState } from 'react';
import { GameScreen } from './components/GameScreen';
import { SetupScreen } from './components/SetupScreen';
import { SummaryScreen } from './components/SummaryScreen';
import { AppScreen, GameResult, STARTER_VOCAB, VocabWord } from './types/vocab';

const STORAGE_KEY = 'vocab_shooter_words_v1';

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

export default function App() {
  const [words, setWords] = useState<VocabWord[]>(loadInitialWords);
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

  const handleAddWord = (english: string, vietnamese: string) => {
    const newWord: VocabWord = {
      id: `word-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      english,
      vietnamese,
    };
    setWords((prev) => [newWord, ...prev]);
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
      onAddWord={handleAddWord}
      onDeleteWord={handleDeleteWord}
      onClearAll={handleClearAll}
      onLoadStarter={handleLoadStarter}
      onStartGame={handleStartGame}
    />
  );
}
