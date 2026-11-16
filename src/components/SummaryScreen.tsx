import React from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { GameResult } from '../types/vocab';
import { DoodleStar, NotebookBinderHoles, RedUnderlineSvg } from './DoodleDecoration';

interface SummaryScreenProps {
  result: GameResult;
  onPlayAgain: () => void;
  onBackToSetup: () => void;
}

export function SummaryScreen({
  result,
  onPlayAgain,
  onBackToSetup,
}: SummaryScreenProps) {
  return (
    <div className="min-h-screen notebook-paper relative">
      <NotebookBinderHoles />

      <div className="max-w-3xl mx-auto pl-9 sm:pl-20 pr-4 sm:pr-8 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3">
            <DoodleStar className="w-9 h-9 -rotate-6 shrink-0" />
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Kết thúc lượt chơi
            </h1>
          </div>
          <RedUnderlineSvg className="w-52 h-3 mt-0.5 mb-2" />
          <p className="text-lg text-slate-700">
            Tổng hợp kết quả và những từ vựng cần ôn lại trong trang vở hôm nay.
          </p>
        </header>

        {/* Scoreboard summary card */}
        <section className="sketch-box bg-[#fffdf7] p-5 sm:p-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <div className="sketch-box-sm bg-emerald-100 p-4 text-center">
              <div className="text-3xl sm:text-4xl font-display font-bold text-emerald-800 tabular-nums">
                {result.correctCount}
              </div>
              <div className="text-base font-bold text-slate-800 mt-1">
                Từ đã bắn đúng
              </div>
            </div>

            <div className="sketch-box-sm bg-amber-100 p-4 text-center">
              <div className="text-3xl sm:text-4xl font-display font-bold text-amber-800 tabular-nums">
                {result.skippedCount}
              </div>
              <div className="text-base font-bold text-slate-800 mt-1">
                Từ đã bỏ qua (Skip)
              </div>
            </div>

            <div className="sketch-box-sm bg-rose-100 p-4 text-center">
              <div className="text-3xl sm:text-4xl font-display font-bold text-rose-800 tabular-nums">
                {result.missedCount}
              </div>
              <div className="text-base font-bold text-slate-800 mt-1">
                Từ rơi chạm đáy
              </div>
            </div>
          </div>
        </section>

        {/* Review list for skipped / missed words */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-2xl font-bold text-slate-900">
              Từ cần ôn lại
            </h2>
            <span className="text-base text-slate-600 tabular-nums">
              {result.reviewItems.length} / {result.totalWords} từ
            </span>
          </div>

          {result.reviewItems.length === 0 ? (
            <div className="sketch-box bg-emerald-50/90 p-6 sm:p-8 text-center">
              <p className="text-2xl font-display font-bold text-emerald-800 mb-1">
                Xuất sắc! Không bỏ sót từ nào!
              </p>
              <p className="text-lg text-slate-700">
                Bạn đã bắn hạ chính xác toàn bộ {result.totalWords} từ vựng trong danh sách.
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {result.reviewItems.map((item, idx) => (
                <li
                  key={`${item.word.id}-${idx}`}
                  className="sketch-box-sm bg-white/90 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 min-w-0">
                    <span className="text-xl font-bold text-blue-800 break-words">
                      {item.word.english}
                    </span>
                    <span className="hidden sm:inline text-slate-400" aria-hidden="true">
                      →
                    </span>
                    <span className="text-lg text-slate-800 break-words">
                      {item.word.vietnamese}
                    </span>
                  </div>

                  <span
                    className={`text-sm font-bold whitespace-nowrap shrink-0 ${
                      item.reason === 'skipped' ? 'text-amber-700' : 'text-red-600'
                    }`}
                  >
                    {item.reason === 'skipped' ? 'Đã bỏ qua' : 'Rơi chạm đáy'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3.5">
          <button
            type="button"
            onClick={onBackToSetup}
            className="sketch-btn bg-white hover:bg-slate-100 text-slate-900 font-display text-lg px-5 py-2.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Quay lại danh sách từ</span>
          </button>

          <button
            type="button"
            onClick={onPlayAgain}
            className="sketch-btn bg-amber-300 hover:bg-amber-200 text-slate-900 font-display text-lg px-6 py-2.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Chơi lại</span>
          </button>
        </div>
      </div>
    </div>
  );
}
