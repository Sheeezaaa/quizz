import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Users, 
  Search, 
  Filter, 
  Download, 
  Printer,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileSpreadsheet,
  X,
  Medal,
  ChevronRight
} from 'lucide-react';
import { 
  apiGetLeaderboard, 
  apiPublishResults 
} from '../../utils/api';
import { getStoredParticipants } from '../../utils/storage';

export default function ResultsManagement({ isDark = true }) {
  const [leaderboardData, setLeaderboardData] = useState({ leaderboard: [], stats: null, totalCompetitors: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false });
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);

  const fetchResults = async () => {
    setLoading(true);
    try {
      const lb = await apiGetLeaderboard();
      if (lb && Array.isArray(lb.leaderboard) && lb.leaderboard.length > 0) {
        setLeaderboardData(lb);
      } else {
        // Fallback: build from local storage participants & history
        const localParticipants = getStoredParticipants() || [];
        const built = localParticipants.map((p, idx) => {
          let score = 0;
          let completed = false;
          let inProg = false;
          let answers = [];
          try {
            const hist = localStorage.getItem(`bob_student_history_${p.studentId}`);
            if (hist) {
              const parsed = JSON.parse(hist);
              if (Array.isArray(parsed) && parsed.length > 0) {
                const latest = parsed[parsed.length - 1];
                score = Number(latest.score || 0);
                completed = true;
                answers = latest.answers || [];
              }
            }
          } catch {}

          return {
            rank: idx + 1,
            studentId: p.studentId,
            fullName: p.fullName,
            email: p.email,
            department: p.degreeProgram || p.department || 'Computer Science',
            campus: p.campus || 'Main Campus',
            semester: p.semester || '4th Semester',
            status: completed ? 'Completed' : 'Pending',
            isCompleted: completed,
            isInProgress: inProg,
            score,
            totalQuestions: 14,
            percentage: Math.round((score / 14) * 100),
            attemptCount: completed ? 1 : 0,
            completedAt: null,
            answers,
            isChampion: idx === 0 && score > 0,
          };
        });

        setLeaderboardData({
          leaderboard: built,
          stats: {
            totalStudents: built.length,
            completedCount: built.filter(b => b.isCompleted).length,
            inProgressCount: 0,
            pendingCount: built.filter(b => !b.isCompleted).length,
            topScore: built.length > 0 ? Math.max(...built.map(b => b.score)) : 0,
            averageScore: built.filter(b => b.isCompleted).length > 0
              ? Number((built.filter(b => b.isCompleted).reduce((s, b) => s + b.score, 0) / built.filter(b => b.isCompleted).length).toFixed(1))
              : 0
          },
          totalCompetitors: built.length
        });
      }
    } catch (err) {
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleTogglePublish = async () => {
    const nextState = !isPublished;
    try {
      const res = await apiPublishResults(nextState);
      if (res.success) {
        setIsPublished(nextState);
        setStatusMessage({ text: `Public leaderboard is now ${nextState ? 'PUBLISHED' : 'HIDDEN'}!`, isError: false });
      }
    } catch (err) {
      setStatusMessage({ text: err.message, isError: true });
    }
  };

  const exportCSV = () => {
    const list = leaderboardData.leaderboard;
    if (!list || list.length === 0) return;

    const headers = ["Rank", "Student ID", "Full Name", "Email", "Department", "Campus", "Status", "Score", "Total MCQs", "Accuracy %", "Attempts", "Completed At"];
    const rows = list.map((item, idx) => [
      `"${item.rank || idx + 1}"`,
      `"${item.studentId}"`,
      `"${item.fullName}"`,
      `"${item.email || ''}"`,
      `"${item.department || 'Computer Science'}"`,
      `"${item.campus || 'Main Campus'}"`,
      `"${item.status || (item.isCompleted ? 'Completed' : 'Pending')}"`,
      `"${item.score || 0}"`,
      `"${item.totalQuestions || 14}"`,
      `"${item.percentage || 0}%"`,
      `"${item.attemptCount || 1}"`,
      `"${item.completedAt ? new Date(item.completedAt).toLocaleString() : 'N/A'}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Battle_of_Brains_Student_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered leaderboard
  const filteredStudents = useMemo(() => {
    return (leaderboardData.leaderboard || []).filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        (item.studentId || '').toLowerCase().includes(q) ||
        (item.fullName || '').toLowerCase().includes(q) ||
        (item.department || '').toLowerCase().includes(q) ||
        (item.campus || '').toLowerCase().includes(q);

      const matchStatus = 
        statusFilter === 'ALL' ||
        (statusFilter === 'COMPLETED' && (item.isCompleted || item.status === 'Completed')) ||
        (statusFilter === 'IN_PROGRESS' && (item.isInProgress || item.status === 'In Progress')) ||
        (statusFilter === 'PENDING' && (!item.isCompleted && !item.isInProgress && item.status !== 'Completed'));

      return matchQuery && matchStatus;
    });
  }, [leaderboardData.leaderboard, searchQuery, statusFilter]);

  const stats = leaderboardData.stats || {
    totalStudents: leaderboardData.leaderboard.length,
    completedCount: leaderboardData.leaderboard.filter(l => l.isCompleted || l.status === 'Completed').length,
    inProgressCount: leaderboardData.leaderboard.filter(l => l.isInProgress || l.status === 'In Progress').length,
    pendingCount: leaderboardData.leaderboard.filter(l => !l.isCompleted && l.status !== 'Completed').length,
    topScore: leaderboardData.leaderboard.length > 0 ? Math.max(...leaderboardData.leaderboard.map(l => l.score || 0)) : 0,
    averageScore: 0
  };

  // Theme Helpers
  const cardTheme = isDark
    ? 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-xl'
    : 'bg-white border-slate-200 text-slate-900 shadow-sm';

  const headingColor = isDark ? 'text-white' : 'text-slate-900';
  const subtextColor = isDark ? 'text-slate-400' : 'text-slate-600';
  const tableHeaderBg = isDark ? 'bg-slate-950/80 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-700 border-slate-200';
  const tableRowHover = isDark ? 'hover:bg-slate-800/40 border-slate-800/70' : 'hover:bg-blue-50/40 border-slate-200';

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className={`p-6 sm:p-7 rounded-2xl border ${cardTheme} relative overflow-hidden`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className={`p-3 rounded-2xl border ${
                isDark 
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 shadow-sm'
              }`}>
                <Award className="w-6 h-6" />
              </span>
              <div>
                <h1 className={`text-2xl sm:text-3xl font-heading font-black tracking-tight ${headingColor}`}>
                  Student Results & Official Standings
                </h1>
                <p className={`text-xs sm:text-sm mt-0.5 font-medium ${subtextColor}`}>
                  Single Round Combined CS Championship • All Registered Students & Live Scores
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={exportCSV}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-heading font-bold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV / Excel</span>
            </button>

            <button
              onClick={handleTogglePublish}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-heading font-bold transition-all cursor-pointer ${
                isPublished
                  ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-600 shadow-md shadow-blue-500/20'
                  : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              {isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>{isPublished ? 'Public: Published' : 'Public: Hidden'}</span>
            </button>

            <button
              onClick={fetchResults}
              disabled={loading}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm'
              }`}
              title="Refresh results"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between gap-3 ${
          statusMessage.isError
            ? 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage({ text: '', isError: false })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Total Students */}
        <div className={`p-5 rounded-2xl border ${cardTheme}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Enrolled</span>
            <Users className="w-5 h-5 text-blue-500" />
          </div>
          <div className={`text-2xl sm:text-3xl font-heading font-black mt-2 ${headingColor}`}>
            {stats.totalStudents}
          </div>
          <span className="text-[11px] text-blue-500 font-medium">Registered Candidates</span>
        </div>

        {/* Completed Attempts */}
        <div className={`p-5 rounded-2xl border ${cardTheme}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completed Quizzes</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className={`text-2xl sm:text-3xl font-heading font-black mt-2 ${headingColor}`}>
            {stats.completedCount}
          </div>
          <span className="text-[11px] text-emerald-500 font-medium">Submitted & Graded</span>
        </div>

        {/* Pending / In Progress */}
        <div className={`p-5 rounded-2xl border ${cardTheme}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Pending / Waiting</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className={`text-2xl sm:text-3xl font-heading font-black mt-2 ${headingColor}`}>
            {stats.pendingCount}
          </div>
          <span className="text-[11px] text-amber-500 font-medium">Awaiting Attempt</span>
        </div>

        {/* Top Score */}
        <div className={`p-5 rounded-2xl border ${cardTheme}`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tournament Leader</span>
            <Trophy className="w-5 h-5 text-yellow-500" />
          </div>
          <div className={`text-2xl sm:text-3xl font-heading font-black mt-2 text-amber-400`}>
            {stats.topScore} <span className="text-xs font-normal text-slate-400">pts</span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Highest Achieved</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border ${cardTheme} flex flex-col md:flex-row items-center justify-between gap-3`}>
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, Name, Department..."
            className={`w-full pl-9 pr-4 py-2 rounded-xl border text-xs font-medium focus:outline-none ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white'
            }`}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All Students', count: leaderboardData.leaderboard.length },
            { id: 'COMPLETED', label: 'Completed', count: stats.completedCount },
            { id: 'IN_PROGRESS', label: 'In Progress', count: stats.inProgressCount },
            { id: 'PENDING', label: 'Pending', count: stats.pendingCount },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : isDark
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Table */}
      <div className={`rounded-2xl border overflow-hidden ${cardTheme}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className={`border-b text-[11px] font-heading font-black uppercase tracking-wider ${tableHeaderBg}`}>
              <tr>
                <th className="p-4 w-14 text-center">Rank</th>
                <th className="p-4">Candidate Information</th>
                <th className="p-4">Department & Campus</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-center">Score / Out of</th>
                <th className="p-4 text-center">Accuracy %</th>
                <th className="p-4 text-center">Attempt</th>
                <th className="p-4 text-center">Completion Time</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="font-heading font-bold text-sm">No student records matching your filter</p>
                    <p className="text-xs mt-1">Try adjusting the search query or status filter above.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((item, idx) => {
                  const isCompleted = item.isCompleted || item.status === 'Completed';
                  const isInProg = item.isInProgress || item.status === 'In Progress';
                  const rank = item.rank || idx + 1;

                  return (
                    <tr key={item.studentId} className={`transition-colors ${tableRowHover}`}>
                      {/* Rank */}
                      <td className="p-4 text-center">
                        {isCompleted && rank === 1 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-400/20 text-amber-500 font-black text-xs inline-flex items-center justify-center border border-amber-400/40">
                            🥇
                          </span>
                        ) : isCompleted && rank === 2 ? (
                          <span className="w-7 h-7 rounded-full bg-slate-300/20 text-slate-400 font-black text-xs inline-flex items-center justify-center border border-slate-400/40">
                            🥈
                          </span>
                        ) : isCompleted && rank === 3 ? (
                          <span className="w-7 h-7 rounded-full bg-amber-700/20 text-amber-600 font-black text-xs inline-flex items-center justify-center border border-amber-700/40">
                            🥉
                          </span>
                        ) : (
                          <span className="font-mono font-bold text-slate-400">
                            #{rank}
                          </span>
                        )}
                      </td>

                      {/* Candidate Information */}
                      <td className="p-4">
                        <div className="flex items-center gap-2.5">
                          <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 font-mono font-bold text-xs select-all">
                            {item.studentId}
                          </span>
                          <div>
                            <strong className={`font-heading font-black block text-sm ${headingColor}`}>
                              {item.fullName}
                            </strong>
                            <span className="text-[11px] text-slate-400">{item.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department & Campus */}
                      <td className="p-4">
                        <div className={`font-medium ${headingColor}`}>{item.department || 'Computer Science'}</div>
                        <span className="text-[11px] text-slate-400">{item.campus || 'Main Campus'} • {item.semester || '4th Semester'}</span>
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        {isCompleted ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            ✓ Completed
                          </span>
                        ) : isInProg ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                            ⏳ In Progress
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Score */}
                      <td className="p-4 text-center">
                        <span className={`text-base font-heading font-black font-mono ${
                          isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                        }`}>
                          {item.score || 0}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono"> / {item.totalQuestions || 14}</span>
                      </td>

                      {/* Accuracy */}
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-mono font-bold ${
                            item.percentage >= 80 ? 'text-emerald-500' : item.percentage >= 50 ? 'text-blue-500' : 'text-slate-400'
                          }`}>
                            {item.percentage || 0}%
                          </span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden mt-1">
                            <div 
                              className={`h-full ${
                                item.percentage >= 80 ? 'bg-emerald-500' : item.percentage >= 50 ? 'bg-blue-500' : 'bg-slate-400'
                              }`} 
                              style={{ width: `${item.percentage || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Attempt Count */}
                      <td className="p-4 text-center font-mono font-medium">
                        {item.attemptCount > 1 ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold">
                            Attempt #{item.attemptCount} (Retake)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            Attempt #{item.attemptCount || 1}
                          </span>
                        )}
                      </td>

                      {/* Completion Time */}
                      <td className="p-4 text-center font-mono text-[11px] text-slate-400">
                        {item.completedAt ? (
                          <span>{new Date(item.completedAt).toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedStudentDetail(item)}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
                            }`}
                            title="View student breakdown & answers"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-500" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedStudentDetail(item);
                              setTimeout(() => window.print(), 300);
                            }}
                            className={`p-2 rounded-lg border transition-all cursor-pointer ${
                              isDark
                                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm'
                            }`}
                            title="Print / Save Official Result Card"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Student Answer Breakdown Modal */}
      {selectedStudentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-3xl rounded-3xl border ${cardTheme} shadow-2xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto`}>
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                  Candidate Result Transcript
                </span>
                <h3 className={`text-xl font-heading font-black mt-2 ${headingColor}`}>
                  {selectedStudentDetail.fullName} ({selectedStudentDetail.studentId})
                </h3>
                <p className={`text-xs mt-0.5 ${subtextColor}`}>
                  {selectedStudentDetail.department} • {selectedStudentDetail.campus}
                </p>
              </div>

              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scorecard Summary Pill Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-slate-800/60 border border-blue-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Score</span>
                <div className="text-xl font-black font-heading text-blue-600 dark:text-blue-400 mt-0.5">
                  {selectedStudentDetail.score} pts
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-slate-800/60 border border-emerald-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400">Correct Answers</span>
                <div className="text-xl font-black font-heading text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {selectedStudentDetail.correctCount || selectedStudentDetail.score} MCQs
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-slate-800/60 border border-rose-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400">Wrong Answers</span>
                <div className="text-xl font-black font-heading text-rose-600 dark:text-rose-400 mt-0.5">
                  {selectedStudentDetail.wrongCount || Math.max(0, (selectedStudentDetail.totalQuestions || 14) - selectedStudentDetail.score)} MCQs
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50 dark:bg-slate-800/60 border border-indigo-200 dark:border-slate-700 text-center">
                <span className="text-[10px] font-bold uppercase text-slate-400">Accuracy %</span>
                <div className="text-xl font-black font-heading text-indigo-600 dark:text-indigo-400 mt-0.5">
                  {selectedStudentDetail.percentage}%
                </div>
              </div>
            </div>

            {/* Recorded Questions & Selected Options */}
            <div className="space-y-3">
              <h4 className={`text-sm font-heading font-black uppercase tracking-wider ${headingColor}`}>
                Question-by-Question Evaluation Breakdown
              </h4>

              {selectedStudentDetail.allocatedQuestions && selectedStudentDetail.allocatedQuestions.length > 0 ? (
                <div className="space-y-3">
                  {selectedStudentDetail.allocatedQuestions.map((q, qIdx) => {
                    const ans = (selectedStudentDetail.answers || []).find(a => a.questionId === q.id);
                    const isCorrect = ans ? ans.isCorrect : false;
                    const hasAnswered = ans && ans.selectedOptionIndex !== undefined;

                    return (
                      <div 
                        key={q.id || qIdx} 
                        className={`p-4 rounded-xl border text-xs space-y-2 ${
                          isCorrect
                            ? 'bg-emerald-500/5 border-emerald-500/30'
                            : hasAnswered
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-400 font-mono">
                            Question #{qIdx + 1} • {q.subject || 'Computer Science'}
                          </span>
                          {isCorrect ? (
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                              +1.0 Pt • Correct
                            </span>
                          ) : hasAnswered ? (
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-rose-500/20 text-rose-500 border border-rose-500/30">
                              0.0 Pt • Incorrect
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md font-mono font-bold text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-500">
                              Unanswered / Skipped
                            </span>
                          )}
                        </div>

                        <p className={`font-semibold ${headingColor}`}>{q.question}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {(q.options || []).map((opt, optIdx) => {
                            const isSelected = ans && ans.selectedOptionIndex === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`p-2 rounded-lg border text-[11px] font-medium flex items-center justify-between ${
                                  isSelected
                                    ? isCorrect
                                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400 font-bold'
                                      : 'bg-rose-500/20 border-rose-500/40 text-rose-400 font-bold'
                                    : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                {isSelected && (
                                  <span className="text-[10px] font-mono uppercase font-bold">Selected</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                  <p className="font-bold">No individual question log recorded for this attempt.</p>
                  <p className="mt-1">Candidate status: {selectedStudentDetail.status} • Total Points: {selectedStudentDetail.score}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => window.print()}
                className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Result Card</span>
              </button>

              <button
                onClick={() => setSelectedStudentDetail(null)}
                className="py-2.5 px-5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
