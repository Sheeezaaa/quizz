import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Play,
  Square,
  Save,
  Send,
  AlertCircle,
  CheckCircle2,
  Clock,
  BookOpen,
  Sparkles,
  Info,
  RefreshCw,
  Layers,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import {
  apiGetScheduleStatus,
  apiSaveCompetitionSchedule,
  apiActivateCompetition,
  apiStopCompetition,
  apiPublishQuiz,
  apiPreviewDistribution
} from '../../utils/api';
import { getStoredSchedule, saveStoredSchedule, getStoredPublishedQuestions } from '../../utils/storage';

export default function QuizScheduleAccessControl({ isDark = true }) {
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // 4 Scheduling fields
  const [startDate, setStartDate] = useState('10/12/2026');
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endDate, setEndDate] = useState('10/12/2026');
  const [endTime, setEndTime] = useState('11:00 AM');

  // Question Publishing state
  const [questionCount, setQuestionCount] = useState(14);
  const [distributionPreview, setDistributionPreview] = useState(null);
  const [validationError, setValidationError] = useState('');

  // Live countdown state
  const [countdownText, setCountdownText] = useState('');

  // Fetch status
  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await apiGetScheduleStatus();
      if (res && res.schedule) {
        setStatusData(res);
        setStartDate(res.schedule.startDate || '10/12/2026');
        setStartTime(res.schedule.startTime || '10:00 AM');
        setEndDate(res.schedule.endDate || '10/12/2026');
        setEndTime(res.schedule.endTime || '11:00 AM');
        if (res.schedule.publishedQuestionCount) {
          setQuestionCount(res.schedule.publishedQuestionCount);
        }
      } else {
        const local = getStoredSchedule();
        setStatusData({ schedule: local, state: 'SCHEDULED' });
        setStartDate(local.startDate || '10/12/2026');
        setStartTime(local.startTime || '10:00 AM');
        setEndDate(local.endDate || '10/12/2026');
        setEndTime(local.endTime || '11:00 AM');
      }
    } catch (err) {
      console.warn('Could not fetch server schedule, using local:', err);
      const local = getStoredSchedule();
      setStatusData({ schedule: local, state: 'SCHEDULED' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // 30s poll
    return () => clearInterval(interval);
  }, []);

  // Update Preview whenever questionCount changes
  useEffect(() => {
    const count = parseInt(questionCount, 10);
    if (!count || count < 7) {
      setValidationError('Every subject must have at least one question. Minimum 7 questions required.');
      setDistributionPreview(null);
      return;
    }
    setValidationError('');
    apiPreviewDistribution(count).then((res) => {
      if (res) setDistributionPreview(res);
    }).catch((err) => {
      console.error('Preview error:', err);
    });
  }, [questionCount]);

  // Live Countdown Timer
  useEffect(() => {
    const updateCountdown = () => {
      if (!statusData) return;
      const now = Date.now();
      const start = statusData.startMs;
      const end = statusData.endMs;

      if (statusData.state === 'STOPPED') {
        setCountdownText('Competition Halted by Admin');
        return;
      }

      if (start && now < start) {
        const diff = Math.max(0, start - now);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdownText(`Starts in: ${hours}h ${mins}m ${secs}s`);
      } else if (end && now < end) {
        const diff = Math.max(0, end - now);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor((diff % 3600000) / 60000);
        const secs = Math.floor((diff % 60000) / 1000);
        setCountdownText(`Live: Ends in: ${hours}h ${mins}m ${secs}s`);
      } else if (end && now >= end) {
        setCountdownText('Competition Concluded (Time Over)');
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [statusData]);

  // Action: Save Schedule
  const handleSaveSchedule = async () => {
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await apiSaveCompetitionSchedule({ startDate, startTime, endDate, endTime });
      if (res.error) {
        setFeedback({ type: 'error', message: res.error });
      } else {
        setFeedback({ type: 'success', message: 'Competition schedule saved successfully in Pakistan Standard Time (PKT)!' });
        await fetchStatus();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save schedule.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Publish Quiz
  const handlePublishQuiz = async () => {
    const count = parseInt(questionCount, 10);
    if (!count || count < 7) {
      setValidationError('Every subject must have at least one question. Minimum 7 questions required.');
      return;
    }
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await apiPublishQuiz(count);
      if (res.error) {
        setFeedback({ type: 'error', message: res.error });
      } else {
        setFeedback({
          type: 'success',
          message: `Successfully published ${count} questions distributed evenly across all 7 Computer Science subjects!`
        });
        await fetchStatus();
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to publish questions.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Activate Competition
  const handleActivateCompetition = async () => {
    if (!window.confirm('Are you sure you want to ACTIVATE the competition now? Eligible students will be able to start the quiz immediately!')) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await apiActivateCompetition();
      setFeedback({ type: 'success', message: 'Competition is now officially LIVE!' });
      await fetchStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to activate competition.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Stop Competition
  const handleStopCompetition = async () => {
    if (!window.confirm('Are you sure you want to STOP the competition? All active attempts will be halted and no new submissions will be accepted.')) return;
    try {
      setActionLoading(true);
      setFeedback(null);
      const res = await apiStopCompetition();
      setFeedback({ type: 'warning', message: 'Competition has been STOPPED by Administrator.' });
      await fetchStatus();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message || 'Failed to stop competition.' });
    } finally {
      setActionLoading(false);
    }
  };

  const currentState = statusData?.state || 'SCHEDULED';
  const isLive = currentState === 'LIVE';
  const isStopped = currentState === 'STOPPED';
  const isOver = currentState === 'TIME_OVER';

  // Theme-adaptive classes
  const cardTheme = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const headingColor = isDark ? 'text-white' : 'text-slate-900';
  const subtextColor = isDark ? 'text-slate-400' : 'text-slate-600';
  const labelColor = isDark ? 'text-slate-300 font-bold' : 'text-slate-700 font-bold';

  const inputTheme = isDark
    ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500 focus:bg-slate-900'
    : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/15 shadow-sm';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 sm:p-7 rounded-2xl border ${cardTheme} relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className={`p-3 rounded-2xl border ${
                isDark 
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' 
                  : 'bg-blue-50 text-blue-600 border-blue-200 shadow-sm'
              }`}>
                <CalendarClock className="w-6 h-6" />
              </span>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-heading font-black tracking-tight ${headingColor}`}>
                  QUIZ SCHEDULE & ACCESS CONTROL
                </h1>
                <p className={`text-xs sm:text-sm mt-0.5 font-medium ${subtextColor}`}>
                  Single Round Combined CS Championship • Pakistan Standard Time (PKT – Asia/Karachi)
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center gap-2.5">
            <div className={`px-4 py-2 rounded-xl border font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm ${
              isLive
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 animate-pulse'
                : isStopped
                ? 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-400'
                : isOver
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-400'
                : 'bg-blue-500/15 border-blue-500/40 text-blue-700 dark:text-blue-400'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                isLive ? 'bg-emerald-500' : isStopped ? 'bg-rose-500' : isOver ? 'bg-amber-500' : 'bg-blue-500'
              }`} />
              STATUS: {currentState}
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
              }`}
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Countdown ribbon */}
        <div className={`mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm ${
          isDark ? 'border-slate-800 text-slate-300' : 'border-slate-200 text-slate-700'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            <Clock className="w-4 h-4 text-blue-500" />
            <span>Timezone: <strong className={headingColor}>Asia/Karachi (PKT UTC+5)</strong></span>
          </div>
          {countdownText && (
            <div className={`px-3 py-1 rounded-lg border font-mono text-xs font-bold ${
              isDark 
                ? 'bg-blue-500/15 border-blue-500/30 text-blue-300' 
                : 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
            }`}>
              {countdownText}
            </div>
          )}
        </div>
      </div>

      {/* User Alerts */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          feedback.type === 'success'
            ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-medium'
            : feedback.type === 'warning'
            ? isDark ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800 font-medium'
            : isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800 font-medium'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-500" /> : <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />}
          <span className="text-sm font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Date/Time Inputs + Action Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 4 Scheduling Date & Time Inputs */}
        <div className={`p-6 rounded-2xl border ${cardTheme} space-y-5`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-indigo-400" />
              <h2 className={`text-base sm:text-lg font-heading font-black ${headingColor}`}>
                Competition Window (PKT)
              </h2>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
              isDark 
                ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' 
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              Exact Access Window
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className={`block text-xs uppercase tracking-wider ${labelColor} mb-1.5`}>
                START DATE (DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="10/12/2026"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold focus:outline-none transition-all ${inputTheme}`}
              />
            </div>

            {/* Start Time */}
            <div>
              <label className={`block text-xs uppercase tracking-wider ${labelColor} mb-1.5`}>
                START TIME (HH:MM AM/PM)
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold focus:outline-none transition-all ${inputTheme}`}
              />
            </div>

            {/* End Date */}
            <div>
              <label className={`block text-xs uppercase tracking-wider ${labelColor} mb-1.5`}>
                END DATE (DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="10/12/2026"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold focus:outline-none transition-all ${inputTheme}`}
              />
            </div>

            {/* End Time */}
            <div>
              <label className={`block text-xs uppercase tracking-wider ${labelColor} mb-1.5`}>
                END TIME (HH:MM AM/PM)
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="11:00 AM"
                className={`w-full px-3.5 py-2.5 rounded-xl border font-mono text-sm font-semibold focus:outline-none transition-all ${inputTheme}`}
              />
            </div>
          </div>

          {/* Automatic Access Rules Callout (High Contrast in both Dark and Light) */}
          <div className={`p-4 rounded-xl border text-xs space-y-1.5 leading-relaxed ${
            isDark 
              ? 'bg-slate-800/60 border-slate-700/80 text-slate-300' 
              : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <p className={`flex items-center gap-1.5 font-bold text-xs ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
              <Info className="w-4 h-4 shrink-0" /> Automatic Access Rules:
            </p>
            <p>• <strong className={isDark ? 'text-white' : 'text-slate-900 font-bold'}>Before Start Time:</strong> Students can log in 24/7; quiz arena displays live countdown; Start Quiz button is disabled.</p>
            <p>• <strong className={isDark ? 'text-white' : 'text-slate-900 font-bold'}>During Window:</strong> Eligible students can take the quiz with 30s per question timer.</p>
            <p>• <strong className={isDark ? 'text-white' : 'text-slate-900 font-bold'}>After End Time:</strong> Access strictly blocks all new attempts and rejects answers submitted after cutoff.</p>
          </div>

          {/* Action: SAVE SCHEDULE button */}
          <button
            onClick={handleSaveSchedule}
            disabled={actionLoading}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>SAVE SCHEDULE</span>
          </button>
        </div>

        {/* Card 2: Question Count & Publishing Engine */}
        <div className={`p-6 rounded-2xl border ${cardTheme} space-y-5`}>
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className={`text-base sm:text-lg font-heading font-black ${headingColor}`}>
                Question Bank Publishing
              </h2>
            </div>
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-md border ${
              isDark 
                ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' 
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
            }`}>
              7 Core CS Subjects
            </span>
          </div>

          <div>
            <label className={`block text-xs uppercase tracking-wider ${labelColor} mb-1.5`}>
              TOTAL MCQS FOR COMPETITION (Min 7: e.g. 10, 14, 21, 35, 50)
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                type="number"
                min="7"
                max="200"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className={`w-32 px-3.5 py-2.5 rounded-xl border font-mono text-sm font-bold focus:outline-none transition-all ${inputTheme}`}
              />
              <div className="flex flex-wrap gap-2">
                {[7, 14, 21, 28, 35, 49].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`px-3 py-1.5 text-xs rounded-lg border font-mono font-bold transition cursor-pointer ${
                      parseInt(questionCount, 10) === cnt
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 shadow-sm'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Validation Warning */}
          {validationError && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-800 font-medium'
            }`}>
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Subject Distribution Breakdown Preview (Clean in Light & Dark) */}
          {distributionPreview && (
            <div className={`p-4 rounded-xl border space-y-2.5 ${
              isDark ? 'bg-slate-800/50 border-slate-700/80' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs">
                <span className={`font-bold flex items-center gap-1.5 ${headingColor}`}>
                  <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Subject Distribution Preview ({distributionPreview.totalCount} MCQs):
                </span>
                <span className={`font-mono text-[11px] font-bold ${subtextColor}`}>
                  Bank Available: {distributionPreview.availableCount}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(distributionPreview.targetDistribution || {}).map(([subjId, count]) => {
                  const subMeta = (distributionPreview.subjectBreakdown || {})[subjId];
                  return (
                    <div 
                      key={subjId} 
                      className={`p-2.5 rounded-lg border text-xs transition-all ${
                        isDark 
                          ? 'bg-slate-900/80 border-slate-700' 
                          : 'bg-white border-slate-200 shadow-sm'
                      }`}
                    >
                      <div className={`font-heading font-bold truncate ${headingColor}`} title={subMeta?.name || subjId}>
                        {subMeta?.name || subjId}
                      </div>
                      <div className="text-emerald-600 dark:text-emerald-400 font-mono font-black text-xs mt-1">
                        {count} questions
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action: PUBLISH QUIZ button */}
          <button
            onClick={handlePublishQuiz}
            disabled={actionLoading || !!validationError}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition disabled:opacity-60 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>PUBLISH QUIZ ({questionCount} MCQs)</span>
          </button>
        </div>
      </div>

      {/* Direct Competition Controls (Activate / Stop) */}
      <div className={`p-6 rounded-2xl border ${cardTheme}`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className={`text-base font-heading font-black flex items-center gap-2 ${headingColor}`}>
              <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span>Live Access Override & Tournament Control</span>
            </h3>
            <p className={`text-xs mt-1 font-medium ${subtextColor}`}>
              Manually signal competition launch or immediately stop all attempts in case of emergency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* ACTIVATE COMPETITION button */}
            <button
              onClick={handleActivateCompetition}
              disabled={actionLoading || isLive}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>ACTIVATE COMPETITION</span>
            </button>

            {/* STOP COMPETITION button */}
            <button
              onClick={handleStopCompetition}
              disabled={actionLoading || isStopped}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-500/20 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>STOP COMPETITION</span>
            </button>
          </div>
        </div>
      </div>

      {/* 7 Core Computer Science Subjects Overview */}
      <div className={`p-6 rounded-2xl border ${cardTheme} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h3 className={`text-base font-heading font-black ${headingColor}`}>
              7 Core Computer Science Subjects (Single Combined Round)
            </h3>
            <p className={`text-xs mt-0.5 font-medium ${subtextColor}`}>
              All competition questions are evenly balanced across these domains.
            </p>
          </div>
          <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full border self-start sm:self-auto ${
            isDark 
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            30 Sec / MCQ • +1 Pt Correct • No Negative Marking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {[
            { id: 'pf', name: 'Programming Fundamentals', desc: 'Variables, loops, control structures, functions' },
            { id: 'oop', name: 'Object Oriented Programming', desc: 'Classes, encapsulation, inheritance, polymorphism' },
            { id: 'dsa', name: 'Data Structures & Algorithms', desc: 'Arrays, trees, graphs, sorting, complexity' },
            { id: 'dbms', name: 'Database Systems', desc: 'SQL, normalization, relational algebra, ACID' },
            { id: 'cn', name: 'Computer Networks', desc: 'OSI layers, TCP/IP, routing, protocols' },
            { id: 'se', name: 'Software Engineering', desc: 'SDLC, Agile, testing, software design' },
            { id: 'os', name: 'Operating Systems', desc: 'Processes, threads, memory management, scheduling' }
          ].map((subj, idx) => (
            <div
              key={subj.id}
              className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
                isDark 
                  ? 'bg-slate-800/40 border-slate-700/80 hover:border-slate-600' 
                  : 'bg-slate-50 border-slate-200/90 shadow-sm hover:border-blue-300 hover:bg-white'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                isDark 
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
                  : 'bg-blue-100 text-blue-800 border border-blue-200'
              }`}>
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-heading font-black truncate ${headingColor}`}>
                  {subj.name}
                </div>
                <div className={`text-xs mt-1 leading-relaxed ${subtextColor}`}>
                  {subj.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
