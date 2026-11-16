import React, { useRef, useState } from 'react';
import { Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { MARKER_COLORS, STARTER_VOCAB, VocabWord } from '../types/vocab';
import { DoodleRocketLogo, NotebookBinderHoles, RedUnderlineSvg } from './DoodleDecoration';

interface SetupScreenProps {
  words: VocabWord[];
  onAddWord: (english: string, vietnamese: string) => void;
  onDeleteWord: (id: string) => void;
  onClearAll: () => void;
  onLoadStarter: () => void;
  onStartGame: () => void;
}

export function SetupScreen({
  words,
  onAddWord,
  onDeleteWord,
  onClearAll,
  onLoadStarter,
  onStartGame,
}: SetupScreenProps) {
  const [english, setEnglish] = useState('');
  const [vietnamese, setVietnamese] = useState('');
  const [error, setError] = useState<string | null>(null);
  const englishInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEn = english.trim().replace(/\s+/g, ' ');
    const cleanVi = vietnamese.trim().replace(/\s+/g, ' ');

    if (!cleanEn || !cleanVi) {
      setError('Hãy nhập đủ cả từ tiếng Anh và nghĩa tiếng Việt nhé!');
      return;
    }

    const exists = words.some(
      (w) => w.english.toLowerCase() === cleanEn.toLowerCase()
    );
    if (exists) {
      setError(`Từ "${cleanEn}" đã có trong danh sách rồi.`);
      return;
    }

    onAddWord(cleanEn, cleanVi);
    setEnglish('');
    setVietnamese('');
    setError(null);
    englishInputRef.current?.focus();
  };

  return (
    <div className="min-h-screen notebook-paper relative">
      <NotebookBinderHoles />

      <div className="max-w-5xl mx-auto pl-9 sm:pl-20 pr-4 sm:pr-8 py-8 sm:py-10">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-4 border-b-2 border-dashed border-slate-400/60">
          <div className="flex items-start gap-3.5">
            <DoodleRocketLogo className="w-12 h-12 shrink-0 -rotate-6 mt-1" />
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-tight">
                Vở Bắn Từ Vựng
              </h1>
              <RedUnderlineSvg className="w-48 h-3 -mt-0.5 mb-1.5" />
              <p className="text-base sm:text-lg text-slate-700">
                Viết danh sách từ cần học vào vở, rồi gõ tiếng Anh để bắn hạ các khối nghĩa đang rơi.
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              type="button"
              onClick={onStartGame}
              disabled={words.length === 0}
              className="sketch-btn bg-amber-300 hover:bg-amber-200 text-slate-900 font-display text-lg px-6 py-3 flex items-center gap-2.5 cursor-pointer whitespace-nowrap"
            >
              <Play className="w-5 h-5 fill-slate-900" />
              <span>Bắt đầu chơi</span>
            </button>
          </div>
        </header>

        {/* Main 2-column notebook spread */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Add word form */}
          <section className="lg:col-span-5 sketch-box bg-[#fffdf7] p-5 sm:p-6 relative">
            {/* Decorative masking tape strip */}
            <div
              aria-hidden="true"
              className="w-24 h-5 bg-amber-200/75 border border-amber-400/50 -rotate-2 mx-auto -mt-8 mb-4 shadow-xs"
            />

            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Thêm từ vựng mới
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="english-word"
                  className="block text-base font-bold text-slate-800 mb-1"
                >
                  Từ tiếng Anh
                </label>
                <input
                  ref={englishInputRef}
                  id="english-word"
                  type="text"
                  value={english}
                  onChange={(e) => {
                    setEnglish(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ví dụ: notebook"
                  autoComplete="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  className="sketch-input w-full px-3.5 py-2.5 text-lg text-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div>
                <label
                  htmlFor="vietnamese-meaning"
                  className="block text-base font-bold text-slate-800 mb-1"
                >
                  Nghĩa tiếng Việt
                </label>
                <input
                  id="vietnamese-meaning"
                  type="text"
                  value={vietnamese}
                  onChange={(e) => {
                    setVietnamese(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Ví dụ: quyển vở"
                  autoComplete="off"
                  className="sketch-input w-full px-3.5 py-2.5 text-lg text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="text-red-600 text-base font-bold bg-red-50 border border-red-300 rounded-lg px-3 py-2"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                className="sketch-btn w-full bg-emerald-200 hover:bg-emerald-300 text-slate-900 font-display text-lg py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5 stroke-[2.5]" />
                <span>Thêm vào danh sách</span>
              </button>
            </form>

            {/* Quick actions */}
            <div className="mt-5 pt-4 border-t border-dashed border-slate-300 flex flex-wrap items-center justify-between gap-2 text-sm">
              <button
                type="button"
                onClick={onLoadStarter}
                className="inline-flex items-center gap-1.5 text-blue-700 hover:text-blue-900 underline decoration-wavy underline-offset-4 cursor-pointer py-1"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Dùng {STARTER_VOCAB.length} từ mẫu</span>
              </button>

              {words.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAll}
                  className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 underline underline-offset-4 cursor-pointer py-1"
                >
                  <span>Xóa hết danh sách</span>
                </button>
              )}
            </div>
          </section>

          {/* Right: Vocabulary list */}
          <section className="lg:col-span-7">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-2xl font-bold text-slate-900">
                Danh sách từ sẽ chơi
              </h2>
              <span className="text-base text-slate-600 tabular-nums">
                {words.length} từ vựng
              </span>
            </div>

            {words.length === 0 ? (
              <div className="sketch-box bg-white/70 p-8 text-center">
                <p className="text-xl text-slate-700 mb-2">
                  Trang vở đang trống!
                </p>
                <p className="text-base text-slate-500 mb-5">
                  Hãy thêm vài cặp từ Anh – Việt ở khung bên cạnh hoặc nạp bộ từ mẫu để chơi thử ngay.
                </p>
                <button
                  type="button"
                  onClick={onLoadStarter}
                  className="sketch-btn bg-sky-200 hover:bg-sky-300 text-slate-900 font-display px-5 py-2.5 cursor-pointer"
                >
                  Nạp {STARTER_VOCAB.length} từ mẫu
                </button>
              </div>
            ) : (
              <ul className="space-y-3">
                {words.map((item, idx) => {
                  const swatch = MARKER_COLORS[idx % MARKER_COLORS.length];
                  return (
                    <li
                      key={item.id}
                      className="sketch-box-sm px-4 py-2.5 flex items-center justify-between gap-3 transition-transform"
                      style={{
                        backgroundColor: swatch.fill,
                        transform: idx % 2 === 0 ? 'rotate(-0.35deg)' : 'rotate(0.35deg)',
                      }}
                    >
                      <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-3">
                        <span className="text-xl font-bold text-slate-900 break-words">
                          {item.english}
                        </span>
                        <span className="hidden sm:inline text-slate-500" aria-hidden="true">
                          —
                        </span>
                        <span className="text-lg text-slate-800 break-words">
                          {item.vietnamese}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => onDeleteWord(item.id)}
                        aria-label={`Xóa từ ${item.english}`}
                        title={`Xóa từ ${item.english}`}
                        className="w-10 h-10 shrink-0 rounded-lg border-2 border-transparent hover:border-red-600 hover:bg-white/60 text-slate-700 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}

            {words.length > 0 && (
              <div className="mt-6 flex justify-end lg:hidden">
                <button
                  type="button"
                  onClick={onStartGame}
                  className="sketch-btn w-full sm:w-auto bg-amber-300 hover:bg-amber-200 text-slate-900 font-display text-lg px-7 py-3 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-slate-900" />
                  <span>Bắt đầu chơi</span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
