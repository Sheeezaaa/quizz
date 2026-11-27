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

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      } shadow-xl relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
                <CalendarClock className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl font-bold font-heading text-white">
                  QUIZ SCHEDULE & ACCESS CONTROL
                </h1>
                <p className="text-sm text-slate-400">
                  Single Round Combined CS Championship • Pakistan Standard Time (PKT – Asia/Karachi)
                </p>
              </div>
            </div>
          </div>

          {/* Current Status Badge */}
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border font-bold text-sm flex items-center gap-2 ${
              isLive
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 animate-pulse'
                : isStopped
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-400'
                : isOver
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
            }`}>
              <span className={`w-2.5 h-2.5 rounded-full ${
                isLive ? 'bg-emerald-400' : isStopped ? 'bg-rose-400' : isOver ? 'bg-amber-400' : 'bg-blue-400'
              }`} />
              STATUS: {currentState}
            </div>

            <button
              onClick={fetchStatus}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Live Countdown ribbon */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Timezone: <strong className="text-white">Asia/Karachi (PKT UTC+5)</strong></span>
          </div>
          {countdownText && (
            <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 font-mono text-xs">
              {countdownText}
            </div>
          )}
        </div>
      </div>

      {/* User Alerts */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : feedback.type === 'warning'
            ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {feedback.type === 'success' ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Date/Time Inputs + Action Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: 4 Scheduling Date & Time Inputs */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-lg space-y-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Competition Window (PKT)</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Exact Access Window
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                START DATE (DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                placeholder="10/12/2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                START TIME (HH:MM AM/PM)
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="10:00 AM"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                END DATE (DD/MM/YYYY)
              </label>
              <input
                type="text"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                placeholder="10/12/2026"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                END TIME (HH:MM AM/PM)
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="11:00 AM"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 text-xs text-slate-400 space-y-1">
            <p className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Info className="w-3.5 h-3.5 text-blue-400" /> Automatic Access Rules:
            </p>
            <p>• <strong>Before Start Time:</strong> Students can log in 24/7; quiz arena displays countdown; Start Quiz disabled.</p>
            <p>• <strong>During Window:</strong> Eligible students can take quiz with 30s per question timer.</p>
            <p>• <strong>After End Time:</strong> Access strictly blocks all new attempts and rejects answers submitted after cutoff.</p>
          </div>

          {/* Action: SAVE SCHEDULE button */}
          <button
            onClick={handleSaveSchedule}
            disabled={actionLoading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            SAVE SCHEDULE
          </button>
        </div>

        {/* Card 2: Question Count & Publishing Engine */}
        <div className={`p-6 rounded-2xl border ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        } shadow-lg space-y-5`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">Question Bank Publishing</h2>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              7 Core CS Subjects
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1.5">
              TOTAL MCQS FOR COMPETITION (Min 7: e.g. 10, 14, 21, 35, 50)
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="7"
                max="200"
                value={questionCount}
                onChange={(e) => setQuestionCount(e.target.value)}
                className="w-32 px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 font-bold"
              />
              <div className="flex flex-wrap gap-2">
                {[7, 14, 21, 28, 35, 49].map((cnt) => (
                  <button
                    key={cnt}
                    type="button"
                    onClick={() => setQuestionCount(cnt)}
                    className={`px-2.5 py-1 text-xs rounded-lg border font-mono transition ${
                      parseInt(questionCount, 10) === cnt
                        ? 'bg-emerald-500 text-white border-emerald-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
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
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Subject Distribution Breakdown Preview */}
          {distributionPreview && (
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="font-semibold flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  Subject Distribution Preview ({distributionPreview.totalCount} MCQs):
                </span>
                <span className="text-slate-400">Available: {distributionPreview.availableCount}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(distributionPreview.targetDistribution || {}).map(([subjId, count]) => {
                  const subMeta = (distributionPreview.subjectBreakdown || {})[subjId];
                  return (
                    <div key={subjId} className="p-2 rounded-lg bg-slate-900/60 border border-slate-800 text-xs">
                      <div className="font-bold text-white truncate" title={subMeta?.name || subjId}>
                        {subMeta?.name || subjId}
                      </div>
                      <div className="text-emerald-400 font-mono font-bold mt-0.5">
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
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            PUBLISH QUIZ ({questionCount} MCQs)
          </button>
        </div>
      </div>

      {/* Direct Competition Controls (Activate / Stop) */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      } shadow-lg`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              Live Access Override & Tournament Control
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Manually signal competition launch or immediately stop all attempts in case of emergency.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* ACTIVATE COMPETITION button */}
            <button
              onClick={handleActivateCompetition}
              disabled={actionLoading || isLive}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-white" />
              ACTIVATE COMPETITION
            </button>

            {/* STOP COMPETITION button */}
            <button
              onClick={handleStopCompetition}
              disabled={actionLoading || isStopped}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-sm shadow-lg shadow-rose-500/20 flex items-center gap-2 transition disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-white" />
              STOP COMPETITION
            </button>
          </div>
        </div>
      </div>

      {/* 7 Core Computer Science Subjects Overview */}
      <div className={`p-6 rounded-2xl border ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
      } shadow-lg space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white">7 Core Computer Science Subjects (Single Combined Round)</h3>
            <p className="text-xs text-slate-400">All questions for the championship are evenly balanced across these domains.</p>
          </div>
          <span className="text-xs font-mono px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            30 Sec / MCQ • +1 Pt Correct • No Negative Marking
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
              className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-3 hover:border-slate-600 transition"
            >
              <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 font-mono font-bold text-xs flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">{subj.name}</div>
                <div className="text-xs text-slate-400 line-clamp-2 mt-0.5">{subj.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
