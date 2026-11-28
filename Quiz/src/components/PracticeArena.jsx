import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Clock, 
  Trophy, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Radio, 
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Volume2,
  Lock,
  Eye,
  Check
} from 'lucide-react';
import { PRACTICE_QUESTIONS } from '../data/sampleQuestions';
import { 
  playBuzzerPress, 
  playCorrectChime 
} from '../utils/soundEffects';

// Helper to shuffle mock questions so public website visitors get fresh random practice
const getRandomizedPracticePool = (tabKey) => {
  const pool = PRACTICE_QUESTIONS[tabKey] || PRACTICE_QUESTIONS.round1 || [];
  return [...pool].sort(() => Math.random() - 0.5);
};

export default function PracticeArena({ initialMode = 'round1' }) {
  const [activeTab, setActiveTab] = useState(initialMode);
  const [currentQuestions, setCurrentQuestions] = useState(() => getRandomizedPracticePool(initialMode));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizFinished, setQuizFinished] = useState(false);

  // Practice Arena is 100% free practice mode with no buzzers or proctoring restrictions

  const resetQuiz = () => {
    setCurrentQuestions(getRandomizedPracticePool(activeTab));
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setHasBuzzed(false);
    setQuizFinished(false);


    if (activeTab === 'round1') setTimeLeft(30);
    else if (activeTab === 'rapidFire') setTimeLeft(3);
    else if (activeTab === 'buzzer') setTimeLeft(10);
  };

  const currentQ = currentQuestions[currentIndex] || currentQuestions[0] || PRACTICE_QUESTIONS.round1[0];

  const currentOptions = (currentQ?.options && currentQ.options.length > 0)
    ? currentQ.options
    : [currentQ?.optionA, currentQ?.optionB, currentQ?.optionC, currentQ?.optionD].filter(Boolean);

  useEffect(() => {
    resetQuiz();
  }, [activeTab]);

  // Practice mode: No anti-cheat listeners or alarms

  useEffect(() => {
    if (quizFinished) return;
    if (activeTab === 'buzzer' && !hasBuzzed) return;

    if (timeLeft <= 0) {
      handleTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizFinished, activeTab, hasBuzzed]);

  const handleTimeExpired = () => {
    if (isAnswered) return;
    setIsAnswered(true);

    if (activeTab === 'rapidFire') {
      setTimeout(() => {
        nextQuestion();
      }, 1000);
    }
  };

  const handleBuzz = () => {
    if (hasBuzzed || isAnswered) return;
    playBuzzerPress();
    setHasBuzzed(true);
    setTimeLeft(10);
  };

  const handleSelectOption = (idx) => {
    if (isAnswered) return;
    if (activeTab === 'buzzer' && !hasBuzzed) return;

    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correct;
    if (isCorrect) {
      playCorrectChime();
      setScore((prev) => prev + 1);
    } else {
      if (activeTab === 'buzzer') {
        setScore((prev) => Number((prev - 0.5).toFixed(1)));
      }
    }
  };

  const nextQuestion = () => {
    if (currentIndex < currentQuestions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setHasBuzzed(false);

      if (activeTab === 'round1') setTimeLeft(30);
      else if (activeTab === 'rapidFire') setTimeLeft(3);
      else if (activeTab === 'buzzer') setTimeLeft(10);
    } else {
      setQuizFinished(true);
    }
  };

  return (
    <section id="practice" className="py-20 lg:py-24 relative bg-[#080d1a] overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-heading font-semibold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>Public Solo Practice • Mock Sample Questions Only</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black text-white mb-2">
            Solo <span className="text-[#3b82f6]">Practice Arena</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Randomized mock practice MCQs for public visitors. Official tournament question bank remains strictly confidential and only accessible within the authenticated Student Portal during live exams.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 bg-black/40 p-1.5 rounded-xl border border-white/10 max-w-xl mx-auto">
          <button
            onClick={() => setActiveTab('round1')}
            className="px-6 py-2.5 rounded-lg text-xs font-heading font-bold bg-[#2563eb] text-white shadow-md flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Single Round Championship: 30s MCQs (All 7 CS Disciplines)</span>
          </button>
        </div>

        {/* Practice Mode Friendly Banner */}
        <div className="mb-6 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
            <span><strong>Interactive Practice Arena:</strong> Practice freely with unlimited random questions. No quiz timer cutoffs or proctoring alarms apply here.</span>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-[11px] font-mono font-bold shrink-0 hidden sm:inline-block">
            Practice Mode
          </span>
        </div>

        {/* Simulator Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0b1020]/90 border border-white/10 shadow-2xl relative">
          
          {quizFinished ? (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 mx-auto mb-4">
                <Trophy className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-white mb-2">Practice Run Complete!</h3>
              <p className="text-xs text-slate-300 mb-6">
                Your simulated score for <strong className="text-blue-400 uppercase">{activeTab}</strong>:
              </p>
              
              <div className="font-mono font-black text-5xl text-blue-400 mb-6">
                {score} <span className="text-lg text-slate-400">/ {currentQuestions.length} pts</span>
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={resetQuiz}
                  className="px-6 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-heading font-bold hover:bg-blue-600 inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Try Again</span>
                </button>
              </div>
            </div>
          ) : (
            <div>
              
              {/* Meta bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-300 bg-blue-500/10 px-2.5 py-1 rounded-md border border-blue-500/20">
                    Question {currentIndex + 1} of {currentQuestions.length}
                  </span>
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    • {currentQ.subject}
                  </span>
                </div>

                <div className="flex items-center gap-4">
                  <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold border ${
                    timeLeft <= 3 
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                      : 'bg-black/40 text-blue-300 border-white/10'
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                    <span>{timeLeft}s</span>
                  </div>

                  <div className="text-xs font-mono text-slate-300">
                    Score: <strong className="text-blue-400 font-bold">{score} pts</strong>
                  </div>
                </div>
              </div>

              {/* Buzzer button */}
              {activeTab === 'buzzer' && !hasBuzzed && (
                <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-rose-950/40 via-black/40 to-rose-950/40 border border-rose-500/40 text-center">
                  <p className="text-xs text-rose-300 mb-3 font-semibold">
                    ⚠️ Buzzer lock active! Press buzzer first to earn answering rights (10 seconds to answer).
                  </p>
                  <button
                    onClick={handleBuzz}
                    className="inline-flex items-center gap-2 px-8 py-3 rounded-full bg-gradient-to-r from-rose-600 to-red-500 text-white font-heading font-bold text-sm shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer animate-bounce"
                  >
                    <Radio className="w-4 h-4" />
                    <span>HIT BUZZER NOW!</span>
                  </button>
                </div>
              )}

              {/* Question Text */}
              <div className="mb-6">
                <h3 className="text-base sm:text-lg font-heading font-bold text-slate-900 dark:text-white leading-relaxed">
                  {currentQ.question}
                </h3>
                {currentQ.tip && (
                  <p className="text-xs text-blue-400/90 mt-2 font-mono">
                    💡 {currentQ.tip}
                  </p>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {(currentOptions || []).map((option, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrectAnswer = idx === currentQ.correct;

                  let optionStyle = 'bg-slate-50 dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200 hover:border-blue-500';

                  if (isAnswered) {
                    if (isCorrectAnswer) {
                      optionStyle = 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-200 font-bold';
                    } else if (isSelected) {
                      optionStyle = 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-800 dark:text-rose-200 font-bold';
                    } else {
                      optionStyle = 'bg-slate-100/50 dark:bg-black/20 border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500';
                    }
                  }

                  const isDisabled = (activeTab === 'buzzer' && !hasBuzzed) || isAnswered || timeLeft <= 0;

                  return (
                    <button
                      key={idx}
                      disabled={isDisabled}
                      onClick={() => handleSelectOption(idx)}
                      className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-sans transition-all flex items-center justify-between gap-3 ${optionStyle} ${
                        isDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span>{option}</span>
                      </div>

                      {isAnswered && (
                        <div>
                          {isCorrectAnswer && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                          {isSelected && !isCorrectAnswer && <XCircle className="w-4 h-4 text-rose-400" />}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Next button */}
              {isAnswered && (
                <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn">
                  <div className="text-xs text-slate-300">
                    {currentQ.explanation ? (
                      <p><strong>Note:</strong> {currentQ.explanation}</p>
                    ) : (
                      <p>
                        {selectedOption === currentQ.correct 
                          ? '🎉 Correct! +1 Point added.' 
                          : activeTab === 'buzzer' 
                            ? '❌ Incorrect! -0.5 points penalty deducted as per Buzzer Round rules.' 
                            : '❌ Time or answer expired.'}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={nextQuestion}
                    className="px-5 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-heading font-bold hover:bg-blue-600 shrink-0"
                  >
                    <span>{currentIndex < currentQuestions.length - 1 ? 'Next Question →' : 'View Results'}</span>
                  </button>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      
    </section>
  );
}
