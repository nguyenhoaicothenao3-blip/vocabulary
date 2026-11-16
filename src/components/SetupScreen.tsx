import React, { useMemo, useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Heart,
  Minus,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  Upload,
} from 'lucide-react';
import { GameSettings, MARKER_COLORS, STARTER_VOCAB, VocabWord } from '../types/vocab';
import {
  downloadSampleTemplate,
  ParsedVocabEntry,
  parseBulkVocabText,
  parseVocabFile,
} from '../utils/vocabImport';
import { DoodleRocketLogo, NotebookBinderHoles, RedUnderlineSvg } from './DoodleDecoration';

interface SetupScreenProps {
  words: VocabWord[];
  settings: GameSettings;
  onUpdateSettings: (next: GameSettings) => void;
  onAddWord: (english: string, vietnamese: string) => void;
  onAddWordsBulk: (entries: ParsedVocabEntry[]) => {
    addedCount: number;
    duplicateCount: number;
  };
  onDeleteWord: (id: string) => void;
  onClearAll: () => void;
  onLoadStarter: () => void;
  onStartGame: () => void;
}

export function SetupScreen({
  words,
  settings,
  onUpdateSettings,
  onAddWord,
  onAddWordsBulk,
  onDeleteWord,
  onClearAll,
  onLoadStarter,
  onStartGame,
}: SetupScreenProps) {
  const [addTab, setAddTab] = useState<'single' | 'bulk'>('bulk');
  const [english, setEnglish] = useState('');
  const [vietnamese, setVietnamese] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkFeedback, setBulkFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [isImportingFile, setIsImportingFile] = useState(false);

  const englishInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bulkPreview = useMemo(() => parseBulkVocabText(bulkText), [bulkText]);

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

  const applyParsedResult = (
    entries: ParsedVocabEntry[],
    invalidLineNumbers: number[],
    clearTextOnSuccess: boolean
  ) => {
    if (entries.length === 0) {
      setBulkFeedback({
        type: 'error',
        message:
          invalidLineNumbers.length > 0
            ? `Không đọc được từ nào (lỗi định dạng ở dòng ${invalidLineNumbers.slice(0, 5).join(', ')}). Mỗi dòng cần dạng: tiếng Anh - nghĩa Việt.`
            : 'Chưa có từ vựng hợp lệ nào để thêm.',
      });
      return;
    }

    const { addedCount, duplicateCount } = onAddWordsBulk(entries);
    const notes: string[] = [];
    if (duplicateCount > 0) notes.push(`bỏ qua ${duplicateCount} từ trùng`);
    if (invalidLineNumbers.length > 0) {
      notes.push(
        `${invalidLineNumbers.length} dòng sai định dạng (${invalidLineNumbers.slice(0, 4).join(', ')}${
          invalidLineNumbers.length > 4 ? '...' : ''
        })`
      );
    }

    if (addedCount === 0) {
      setBulkFeedback({
        type: 'error',
        message: `Tất cả ${duplicateCount} từ đã có sẵn trong danh sách rồi.`,
      });
      return;
    }

    setBulkFeedback({
      type: 'success',
      message: `Đã thêm ${addedCount} từ mới${notes.length > 0 ? ` (${notes.join(', ')})` : ''}!`,
    });
    if (clearTextOnSuccess) {
      setBulkText('');
    }
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyParsedResult(bulkPreview.entries, bulkPreview.invalidLineNumbers, true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImportingFile(true);
    setBulkFeedback(null);
    try {
      const result = await parseVocabFile(file);
      applyParsedResult(result.entries, result.invalidLineNumbers, false);
    } catch {
      setBulkFeedback({
        type: 'error',
        message: 'Không thể đọc tệp này. Hãy dùng file .txt, .csv hoặc Excel (.xlsx, .xls) đúng định dạng nhé.',
      });
    } finally {
      setIsImportingFile(false);
    }
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
          {/* Left: Add word form + Mode settings */}
          <div className="lg:col-span-5 space-y-6">
            <section className="sketch-box bg-[#fffdf7] p-5 sm:p-6 relative">
              {/* Decorative masking tape strip */}
              <div
                aria-hidden="true"
                className="w-24 h-5 bg-amber-200/75 border border-amber-400/50 -rotate-2 mx-auto -mt-8 mb-4 shadow-xs"
              />

              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Thêm từ vựng
              </h2>

              {/* Tab switcher: Bulk/File vs Single word */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setAddTab('bulk');
                    setError(null);
                  }}
                  className={`sketch-btn py-1.5 px-2.5 font-display text-sm sm:text-base flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    addTab === 'bulk'
                      ? 'bg-amber-200 text-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Nhập nhanh / File</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddTab('single');
                    setBulkFeedback(null);
                  }}
                  className={`sketch-btn py-1.5 px-2.5 font-display text-sm sm:text-base flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    addTab === 'single'
                      ? 'bg-emerald-200 text-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>Nhập từng từ</span>
                </button>
              </div>

              {addTab === 'single' ? (
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
              ) : (
                <div className="space-y-4">
                  {/* Option 1: Bulk text paste */}
                  <form onSubmit={handleBulkSubmit} className="space-y-2.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <label
                        htmlFor="bulk-vocab-textarea"
                        className="text-base font-bold text-slate-800"
                      >
                        Dán danh sách từ (mỗi dòng 1 từ)
                      </label>
                      {bulkText.trim() && (
                        <span className="text-xs font-bold text-blue-700 tabular-nums">
                          {bulkPreview.entries.length} từ hợp lệ
                        </span>
                      )}
                    </div>

                    <textarea
                      id="bulk-vocab-textarea"
                      rows={5}
                      value={bulkText}
                      onChange={(e) => {
                        setBulkText(e.target.value);
                        if (bulkFeedback) setBulkFeedback(null);
                      }}
                      placeholder={
                        'notebook - quyển vở\nspaceship: tàu vũ trụ\npencil | bút chì\n(hoặc copy-paste 2 cột từ Excel)'
                      }
                      spellCheck={false}
                      className="sketch-input w-full px-3 py-2 text-base text-slate-900 placeholder:text-slate-400 leading-snug resize-y"
                    />

                    <p className="text-xs text-slate-600">
                      Hỗ trợ dấu ngăn cách: <code className="font-bold">-</code>,{' '}
                      <code className="font-bold">:</code>, <code className="font-bold">|</code>,{' '}
                      <code className="font-bold">;</code>, <code className="font-bold">,</code> hoặc Tab (copy từ Excel).
                    </p>

                    <button
                      type="submit"
                      disabled={bulkPreview.entries.length === 0}
                      className="sketch-btn w-full bg-emerald-200 hover:bg-emerald-300 text-slate-900 font-display text-base py-2 px-4 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span>
                        Thêm {bulkPreview.entries.length > 0 ? `${bulkPreview.entries.length} ` : ''}từ từ văn bản
                      </span>
                    </button>
                  </form>

                  {/* Option 2: Upload .txt or Excel file */}
                  <div className="pt-3.5 border-t border-dashed border-slate-300 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-base font-bold text-slate-800">
                        Hoặc tải lên file .txt / Excel
                      </span>
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv,.xlsx,.xls,text/plain,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                      onChange={handleFileUpload}
                      className="hidden"
                    />

                    <button
                      type="button"
                      disabled={isImportingFile}
                      onClick={() => fileInputRef.current?.click()}
                      className="sketch-btn w-full bg-sky-100 hover:bg-sky-200 text-slate-900 font-display text-base py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {isImportingFile
                          ? 'Đang đọc file...'
                          : 'Chọn file .txt, .xlsx, .xls, .csv'}
                      </span>
                    </button>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                      <span>Cột A: Tiếng Anh · Cột B: Nghĩa Việt</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => downloadSampleTemplate('txt')}
                          className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 underline cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Mẫu .txt</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => downloadSampleTemplate('xlsx')}
                          className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Mẫu Excel</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {bulkFeedback && (
                    <p
                      role="status"
                      className={`text-sm font-bold rounded-lg px-3 py-2 border ${
                        bulkFeedback.type === 'success'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                          : 'bg-red-50 border-red-300 text-red-700'
                      }`}
                    >
                      {bulkFeedback.message}
                    </p>
                  )}
                </div>
              )}

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

            {/* Game Mode & Difficulty Settings */}
            <section className="sketch-box bg-[#fffdf7] p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-3.5">
                <SlidersHorizontal className="w-5 h-5 text-slate-800" />
                <h2 className="text-xl font-bold text-slate-900">
                  Cài đặt chế độ chơi
                </h2>
              </div>

              {/* Falling word language selector */}
              <div className="mb-4 pb-4 border-b border-dashed border-slate-300">
                <div className="text-base font-bold text-slate-800 mb-2">
                  Từ vựng rơi xuống
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, fallLanguage: 'vi' })}
                    className={`sketch-btn py-1.5 px-2 font-display text-sm sm:text-base cursor-pointer whitespace-nowrap ${
                      settings.fallLanguage === 'vi'
                        ? 'bg-sky-200 text-slate-900'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tiếng Việt
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, fallLanguage: 'en' })}
                    className={`sketch-btn py-1.5 px-2 font-display text-sm sm:text-base cursor-pointer whitespace-nowrap ${
                      settings.fallLanguage === 'en'
                        ? 'bg-sky-200 text-slate-900'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Tiếng Anh
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ ...settings, fallLanguage: 'random' })}
                    className={`sketch-btn py-1.5 px-2 font-display text-sm sm:text-base cursor-pointer whitespace-nowrap ${
                      settings.fallLanguage === 'random'
                        ? 'bg-sky-200 text-slate-900'
                        : 'bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Ngẫu nhiên
                  </button>
                </div>
                <p className="text-sm text-slate-600 mt-2">
                  {settings.fallLanguage === 'vi'
                    ? 'Khối từ rơi hiện nghĩa tiếng Việt — bạn gõ từ tiếng Anh để bắn.'
                    : settings.fallLanguage === 'en'
                    ? 'Khối từ rơi hiện từ tiếng Anh — bạn gõ nghĩa tiếng Việt để bắn.'
                    : 'Mỗi khối từ rơi hiện ngẫu nhiên tiếng Anh hoặc tiếng Việt để bạn gõ đáp án tương ứng.'}
                </p>
              </div>

              {/* Segmented mode selector */}
              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, mode: 'easy' })}
                  className={`sketch-btn py-2 px-3 font-display text-base cursor-pointer whitespace-nowrap ${
                    settings.mode === 'easy'
                      ? 'bg-emerald-200 text-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Chế độ Dễ
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ ...settings, mode: 'medium' })}
                  className={`sketch-btn py-2 px-3 font-display text-base cursor-pointer whitespace-nowrap ${
                    settings.mode === 'medium'
                      ? 'bg-amber-200 text-slate-900'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Chế độ Trung bình
                </button>
              </div>

              {settings.mode === 'easy' ? (
                <ul className="text-base text-slate-700 space-y-1.5 list-disc pl-5">
                  <li>Gõ đúng từng chữ cái để tàu bắn ra từng nét đạn nhỏ.</li>
                  <li>Không giới hạn số lần gõ sai và không mất tim.</li>
                  <li>Từ vựng rơi xuống chậm rãi, thoải mái ghi nhớ.</li>
                </ul>
              ) : (
                <div className="space-y-4">
                  <ul className="text-base text-slate-700 space-y-1 list-disc pl-5">
                    <li>Nhập đầy đủ cả từ rồi nhấn <strong>Enter</strong> để bắn đạn đại bác lớn.</li>
                    <li>Mỗi lần nhấn Enter sai sẽ mất 1 tim và bị người que cản đạn.</li>
                  </ul>

                  {/* Hearts count control */}
                  <div className="pt-3 border-t border-dashed border-slate-300 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-slate-800">
                        Số lượng tim
                      </div>
                      <div className="text-sm text-slate-500">
                        Giới hạn số lần nhập sai
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            mediumHearts: Math.max(1, settings.mediumHearts - 1),
                          })
                        }
                        disabled={settings.mediumHearts <= 1}
                        aria-label="Giảm số tim"
                        className="w-9 h-9 rounded-lg border-2 border-slate-800 bg-white hover:bg-rose-100 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-4 h-4" />
                      </button>

                      <span className="min-w-[3.5rem] text-center font-display font-bold text-lg text-red-600 tabular-nums inline-flex items-center justify-center gap-1">
                        <Heart className="w-4 h-4 fill-red-500 text-red-600" />
                        {settings.mediumHearts}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            mediumHearts: Math.min(10, settings.mediumHearts + 1),
                          })
                        }
                        disabled={settings.mediumHearts >= 10}
                        aria-label="Tăng số tim"
                        className="w-9 h-9 rounded-lg border-2 border-slate-800 bg-white hover:bg-emerald-100 disabled:opacity-40 flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Speed multiplier control */}
                  <div className="pt-3 border-t border-dashed border-slate-300">
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <label
                        htmlFor="medium-speed-range"
                        className="text-base font-bold text-slate-800"
                      >
                        Tốc độ rơi so với chế độ Dễ
                      </label>
                      <span className="font-display font-bold text-blue-700 tabular-nums text-base whitespace-nowrap">
                        {settings.mediumSpeedMultiplier.toFixed(1)}x (+
                        {Math.round((settings.mediumSpeedMultiplier - 1) * 100)}%)
                      </span>
                    </div>

                    <input
                      id="medium-speed-range"
                      type="range"
                      min={1.2}
                      max={2.5}
                      step={0.1}
                      value={settings.mediumSpeedMultiplier}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          mediumSpeedMultiplier: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-blue-700 cursor-pointer"
                    />

                    <div className="flex justify-between text-xs text-slate-500 tabular-nums mt-0.5">
                      <span>1.2x (+20%)</span>
                      <span>1.8x (+80%)</span>
                      <span>2.5x (+150%)</span>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>

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
