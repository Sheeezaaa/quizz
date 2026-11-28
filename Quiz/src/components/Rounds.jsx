import React from 'react';
import { 
  CheckCircle2, 
  Layers, 
  Zap, 
  Trophy, 
  Clock, 
  ArrowRight,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { COMPETITION_ROUNDS } from '../data/competitionData';

const ICON_MAP = {
  CheckCircle2,
  Layers,
  Zap,
  Trophy,
};

export default function Rounds({ onTryPractice, rounds: propRounds }) {
  const roundsList = propRounds || COMPETITION_ROUNDS;
  return (
    <section id="rounds" className="py-20 lg:py-24 relative overflow-hidden bg-[#060a14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tournament Format</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-black text-white mb-4">
            Single Round <span className="text-[#3b82f6]">Championship Quiz</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            One comprehensive grand competition round evenly distributed across all seven core Computer Science domains. 15 seconds per question, +1 point for correct answers, and zero negative marking.
          </p>
        </div>

        {/* Timeline Progression Bar */}
        <div className="hidden lg:flex items-center justify-between max-w-4xl mx-auto mb-14 relative px-8">
          <div className="absolute top-1/2 left-12 right-12 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-400 -translate-y-1/2 z-0 opacity-40"></div>
          
          {roundsList.map((r, i) => (
            <div key={i} className="relative z-10 flex flex-col items-center">
              <div className={`w-11 h-11 rounded-full border-2 flex items-center justify-center font-heading font-bold text-sm shadow-lg ${
                r.roundNumber === 4 
                  ? 'bg-gradient-to-br from-blue-600 to-indigo-600 border-blue-400 text-white font-black' 
                  : 'bg-[#080d1a] border-white/20 text-white'
              }`}>
                0{r.roundNumber}
              </div>
              <span className="text-[11px] font-heading font-semibold text-slate-300 mt-2">
                {r.status}
              </span>
            </div>
          ))}
        </div>

        {/* 4 Rounds Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-7">
          {roundsList.map((round) => {
            const Icon = ICON_MAP[round.icon] || Trophy;
            const isFinal = round.roundNumber === 4;

            return (
              <div
                key={round.roundNumber}
                className={`p-5 sm:p-7 rounded-2xl relative flex flex-col justify-between transition-all duration-300 shadow-sm ${
                  isFinal
                    ? 'border-2 border-blue-500 bg-white dark:bg-gradient-to-br dark:from-[#0c142c] dark:via-[#080d1a] dark:to-[#040814] shadow-md dark:shadow-xl'
                    : 'border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b1020]/80'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className={`text-xs font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border ${
                      isFinal
                        ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/40'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                    }`}>
                      Round 0{round.roundNumber}
                    </span>

                    <span className="text-xs text-slate-500 dark:text-slate-400 font-heading font-semibold">
                      {round.stageBadge}
                    </span>
                  </div>

                  <div className="flex items-start gap-3.5 mb-5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                      isFinal 
                        ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-200 dark:border-blue-500/40 text-blue-600 dark:text-blue-400' 
                        : 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div>
                      <h3 className="text-xl sm:text-2xl font-heading font-black text-slate-900 dark:text-white leading-tight">
                        {round.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        {round.questionsCount}
                      </p>
                    </div>
                  </div>

                  {/* Rules Box */}
                  <div className="space-y-2.5 bg-slate-50 dark:bg-black/40 p-4 rounded-xl border border-slate-200 dark:border-white/10 mb-6 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <div><strong className="text-slate-900 dark:text-white font-bold">Time Allowed:</strong> {round.timeLimit}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div><strong className="text-slate-900 dark:text-white font-bold">Correct Answer:</strong> {round.markingScheme}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 shrink-0 ${isFinal ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} />
                      <div>
                        <strong className="text-slate-900 dark:text-white font-bold">Negative Marking:</strong>{' '}
                        <span className={isFinal ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-300 font-medium'}>
                          {round.negativeMarking}
                        </span>
                      </div>
                    </div>

                    {/* Highly readable warning rule box */}
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed flex items-start gap-2 font-medium">
                      <span className="text-amber-600 shrink-0 text-xs">⚠️</span>
                      <span>{round.strictRule}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 dark:border-white/10 mt-auto flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    <Trophy className={`w-4 h-4 ${isFinal ? 'text-amber-500' : 'text-blue-600 dark:text-blue-400'}`} />
                    <span className="font-heading font-bold text-slate-900 dark:text-white">
                      {round.qualification}
                    </span>
                  </div>

                  <button
                    onClick={() => onTryPractice && onTryPractice(round.roundNumber)}
                    className="inline-flex items-center gap-1 text-[11px] font-heading font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors shrink-0 cursor-pointer"
                  >
                    <span>Try Sample</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
