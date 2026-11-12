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
import { getStoredQuestions } from '../utils/storage';
import { 
  playAntiCheatBuzzer, 
  playDisqualificationSiren, 
  playBuzzerPress, 
  playCorrectChime 
} from '../utils/soundEffects';

export default function PracticeArena({ initialMode = 'round1' }) {
  const [activeTab, setActiveTab] = useState(initialMode);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const [quizFinished, setQuizFinished] = useState(false);
  const [storedQuestionsList, setStoredQuestionsList] = useState(() => getStoredQuestions());

  // Practice Arena: Anti-cheat disabled on public website browsing so visitors aren't startled by buzzers
  const [antiCheatActive, setAntiCheatActive] = useState(false);
  const [tabViolations, setTabViolations] = useState([]);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [latestViolationReason, setLatestViolationReason] = useState('');
  const [isDisqualified, setIsDisqualified] = useState(false);

  useEffect(() => {
    setStoredQuestionsList(getStoredQuestions());
  }, [activeTab]);

  // Dynamically filter stored questions by round stage or fallback to defaults
  let roundQuestions = [];
  if (activeTab === 'round1') {
    roundQuestions = storedQuestionsList.filter((q) => 
      (q.round || '').toLowerCase().includes('round 1') || 
      (q.round || '').toLowerCase().includes('mcq')
    );
  } else if (activeTab === 'rapidFire') {
    roundQuestions = storedQuestionsList.filter((q) => 
      (q.round || '').toLowerCase().includes('rapid') || 
      (q.round || '').toLowerCase().includes('round 3')
    );
  } else if (activeTab === 'buzzer') {
    roundQuestions = storedQuestionsList.filter((q) => 
      (q.round || '').toLowerCase().includes('buzzer') || 
      (q.round || '').toLowerCase().includes('round 4')
    );
  }

  const currentQuestions = (roundQuestions.length > 0) 
    ? roundQuestions 
    : (PRACTICE_QUESTIONS[activeTab] || PRACTICE_QUESTIONS.round1);

  const currentQ = currentQuestions[currentIndex] || currentQuestions[0] || PRACTICE_QUESTIONS.round1[0];

  const currentOptions = (currentQ?.options && currentQ.options.length > 0)
    ? currentQ.options
    : [currentQ?.optionA, currentQ?.optionB, currentQ?.optionC, currentQ?.optionD].filter(Boolean);

  useEffect(() => {
    resetQuiz();
  }, [activeTab]);

  // =========================================================================
  // ANTI-CHEAT & TAB SWITCH BUZZER PROCTORING LISTENER
  // =========================================================================
  useEffect(() => {
    // Only monitor if anti-cheat is active, quiz is currently running, and user is not finished/disqualified
    if (!antiCheatActive || quizFinished || isDisqualified) return;

    const triggerInfraction = (reason) => {
      // 1. SOUND THE LOUD WARNING BUZZER ALARM!
      playAntiCheatBuzzer();

      const timeString = new Date().toLocaleTimeString();
      const infractionRecord = { time: timeString, reason };

      setTabViolations((prev) => {
        const updated = [...prev, infractionRecord];
        try {
          localStorage.setItem('bob_proctoring_incidents', JSON.stringify(updated));
        } catch {}

        if (updated.length >= 2) {
          setIsDisqualified(true);
          playDisqualificationSiren();
        }
        return updated;
      });

      setLatestViolationReason(reason);
      setShowWarningModal(true);
    };

    // Detect switching tabs or minimizing browser window
    const handleVisibilityChange = () => {
      if (document.hidden) {
        triggerInfraction('Browser Tab Switched / Window Minimized to Background');
      }
    };

    // Detect browser window losing focus (clicking into another app or window)
    const handleWindowBlur = () => {
      triggerInfraction('Browser Window Lost Focus (Switched to Another App / Window)');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [antiCheatActive, quizFinished, isDisqualified]);

  // Block right-click context menu and copying during competition
  useEffect(() => {
    if (!antiCheatActive || quizFinished || isDisqualified) return;

    const handleContextMenu = (e) => {
      e.preventDefault();
      playAntiCheatBuzzer();
    };

    const handleKeyDown = (e) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+U, F12
      if (
        (e.ctrlKey && ['c', 'v', 'u', 'a', 'p'].includes(e.key.toLowerCase())) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        playAntiCheatBuzzer();
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [antiCheatActive, quizFinished, isDisqualified]);

  useEffect(() => {
    if (quizFinished || isDisqualified) return;
    if (activeTab === 'buzzer' && !hasBuzzed) return;

    if (timeLeft <= 0) {
      handleTimeExpired();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, quizFinished, isDisqualified, activeTab, hasBuzzed]);

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setHasBuzzed(false);
    setQuizFinished(false);
    setIsDisqualified(false);
    setShowWarningModal(false);

    if (activeTab === 'round1') setTimeLeft(30);
    else if (activeTab === 'rapidFire') setTimeLeft(3);
    else if (activeTab === 'buzzer') setTimeLeft(10);
  };

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
    if (hasBuzzed || isAnswered || isDisqualified) return;
    playBuzzerPress();
    setHasBuzzed(true);
    setTimeLeft(10);
  };

  const handleSelectOption = (idx) => {
    if (isAnswered || isDisqualified) return;
    if (activeTab === 'buzzer' && !hasBuzzed) return;

    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.correct;
    if (isCorrect) {
      playCorrectChime();
      setScore((prev) => prev + 1);
    } else {
      if (activeTab === 'buzzer') {
        playAntiCheatBuzzer();
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
            <span>Interactive Simulator</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-heading font-black text-white mb-2">
            Solo <span className="text-[#3b82f6]">Practice Arena</span>
          </h2>
          <p className="text-slate-300 text-xs sm:text-sm">
            Experience the authentic pressure of each official tournament round before event day!
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-6 bg-black/40 p-1.5 rounded-xl border border-white/10 max-w-xl mx-auto">
          <button
            onClick={() => setActiveTab('round1')}
            className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeTab === 'round1'
                ? 'bg-[#2563eb] text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Round 1: 30s MCQ
          </button>

          <button
            onClick={() => setActiveTab('rapidFire')}
            className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeTab === 'rapidFire'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Round 3: 3s Rapid Fire
          </button>

          <button
            onClick={() => setActiveTab('buzzer')}
            className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold transition-all ${
              activeTab === 'buzzer'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Round 4: Buzzer Final (-0.5 pt)
          </button>
        </div>

        {/* Anti-Cheat & Tab Switch Proctoring Bar */}
        <div className="mb-6 p-4 rounded-2xl bg-black/60 border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${antiCheatActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            <div>
              <span className="font-heading font-bold text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Strict Competition Anti-Cheat & Tab-Switch Alarm</span>
              </span>
              <p className="text-[11px] text-slate-400">
                Switching browser tabs or minimizing the window triggers the loud buzzer alarm and records a violation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold border ${
              tabViolations.length > 0 
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' 
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
              Tab Violations: {tabViolations.length} / 2 Allowed
            </span>

            <button
              onClick={() => playAntiCheatBuzzer()}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              title="Test the loud electronic buzzer sound"
            >
              <Volume2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Test Buzzer</span>
            </button>
          </div>
        </div>

        {/* Simulator Box */}
        <div className="p-6 sm:p-8 rounded-2xl bg-[#0b1020]/90 border border-white/10 shadow-2xl relative">
          
          {isDisqualified ? (
            <div className="text-center py-10 space-y-4">
              <div className="w-16 h-16 rounded-full bg-rose-600/20 border-2 border-rose-500 flex items-center justify-center text-rose-500 mx-auto animate-pulse">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-heading font-black text-rose-500">
                DISQUALIFIED: CHEATING INFRACTION DETECTED
              </h3>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                You have repeatedly switched browser tabs or minimized the quiz window during the competition. As per Rule 03 (Integrity Code), your participation has been invalidated.
              </p>
              <div className="pt-4">
                <button
                  onClick={resetQuiz}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-heading font-bold text-xs"
                >
                  Restart Authorized Session
                </button>
              </div>
            </div>
          ) : quizFinished ? (
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

      {/* =========================================================================
          FULL-SCREEN EMERGENCY PROCTORING BUZZER ALARM MODAL (OFFICIAL PROCTORING)
          ========================================================================= */}
      {showWarningModal && (
        <div className="proctor-modal-container fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-xl animate-fadeIn">
          <div className="relative w-full max-w-lg bg-gradient-to-b from-[#180e14] via-[#120a10] to-[#0c050a] border border-rose-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(244,63,94,0.35)] text-center space-y-6 overflow-hidden ring-1 ring-rose-500/20">
            
            {/* Ambient Red Glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 bg-rose-600/25 rounded-full blur-3xl pointer-events-none" />

            {/* Glowing Shield Icon */}
            <div className="relative mx-auto w-20 h-20 flex items-center justify-center">
              <div className="absolute inset-0 rounded-3xl bg-rose-500/20 animate-ping opacity-25" />
              <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-500/30 to-red-600/20 border-2 border-rose-500/60 flex items-center justify-center text-rose-400 shadow-xl shadow-rose-950">
                <ShieldAlert className="w-10 h-10 text-rose-400 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
              </div>
            </div>

            {/* Header Status & Text */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span>Proctored Violation Buzzer Sounded</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-tight leading-snug">
                {isDisqualified ? 'Disqualified: Cheating Detected' : 'Unauthorized Tab / Browser Switch!'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans max-w-md mx-auto pt-1">
                {isDisqualified
                  ? 'Multiple unauthorized window blur or browser tab switch events were recorded during your examination session. In accordance with Article 03 (Integrity & Proctoring Regulations), this session has been locked.'
                  : 'Switching browser tabs, minimizing the screen, or accessing external applications during an active test session is strictly prohibited. An infraction alert has been logged with the proctoring console.'}
              </p>
            </div>

            {/* Infraction Details Box (Clean & Readable, No Truncation) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-black/60 border border-rose-500/30 text-left text-xs font-mono space-y-3 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase text-slate-400">Infraction Type:</span>
                <span className="font-semibold text-rose-200 text-left sm:text-right">
                  {latestViolationReason || 'Browser Window Lost Focus / Tab Switch'}
                </span>
              </div>
              <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
                <span className="text-[11px] font-bold uppercase text-slate-400">Violation Count:</span>
                <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-xs">
                  {tabViolations.length} / 2 Maximum Allowed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase text-slate-400">System Status:</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  🚨 Alarm Sounded & Logged to Admin
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div>
              {!isDisqualified ? (
                <button
                  type="button"
                  onClick={() => setShowWarningModal(false)}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-black text-sm tracking-wide shadow-xl shadow-rose-600/40 hover:shadow-rose-600/60 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>I Acknowledge — Return to Examination</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowWarningModal(false);
                    resetQuiz();
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-heading font-black text-sm tracking-wide shadow-xl shadow-blue-600/30 hover:shadow-blue-600/50 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Authorized Session</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </section>
  );
}
