import React, { useState, useEffect, useMemo } from 'react';
import { 
  KeyRound, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  RotateCcw, 
  Lock, 
  Unlock, 
  UserCheck, 
  ShieldCheck, 
  RefreshCw, 
  Users, 
  Award, 
  FileText, 
  Check, 
  X,
  History,
  Sparkles,
  ChevronRight,
  BookOpen
} from 'lucide-react';
import { 
  apiGetRetakePermissions, 
  apiGrantRetakeAccess, 
  apiRevokeRetakeAccess 
} from '../../utils/api';

export default function RetakePermissionsManager({ isDark }) {
  const [data, setData] = useState({ students: [], permissions: [], stats: {} });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Completed' | 'PermissionGranted' | 'Pending'
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal / Grant Dialog State
  const [selectedStudentForGrant, setSelectedStudentForGrant] = useState(null);
  const [grantReason, setGrantReason] = useState('Special exam retake authorized by administrator');

  const fetchPermissionsData = async () => {
    setLoading(true);
    try {
      const res = await apiGetRetakePermissions();
      if (res && res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Error fetching retake permissions data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissionsData();
  }, []);

  // Handle Grant Retake Permission
  const handleGrant = async (e) => {
    e?.preventDefault();
    if (!selectedStudentForGrant) return;

    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await apiGrantRetakeAccess(
        selectedStudentForGrant.studentId,
        1, // Single Combined Championship Round
        grantReason || 'Special retake authorized by administrator'
      );

      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: `Retake access successfully GRANTED for ${selectedStudentForGrant.fullName}. One additional attempt is now permitted.`,
        });
        setSelectedStudentForGrant(null);
        await fetchPermissionsData();
      } else {
        setActionFeedback({
          type: 'error',
          message: res?.error || 'Failed to grant retake permission.',
        });
      }
    } catch (err) {
      setActionFeedback({
        type: 'error',
        message: 'Network or server error while granting retake permission.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Revoke Permission
  const handleRevoke = async (permissionId, studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to revoke retake access for ${studentName || studentId}? The candidate will remain locked.`)) {
      return;
    }

    setIsSubmitting(true);
    setActionFeedback(null);
    try {
      const res = await apiRevokeRetakeAccess(permissionId, studentId, 1);
      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: `Retake access successfully revoked for ${studentName || studentId}.`,
        });
        await fetchPermissionsData();
      } else {
        setActionFeedback({ type: 'error', message: res?.error || 'Failed to revoke permission.' });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: 'Error revoking retake permission.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Students List
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data.students || []).filter((s) => {
      const matchesSearch = !q || 
        s.studentId.toLowerCase().includes(q) || 
        s.fullName.toLowerCase().includes(q) || 
        s.department.toLowerCase().includes(q) || 
        (s.email && s.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const r1 = s.rounds?.[1] || {};
      const isDone = r1.isCompleted;
      const hasPerm = r1.hasRetakePermission;

      if (statusFilter === 'Completed') {
        if (!isDone) return false;
      } else if (statusFilter === 'PermissionGranted') {
        if (!hasPerm) return false;
      } else if (statusFilter === 'Pending') {
        if (isDone) return false;
      }

      return true;
    });
  }, [data.students, search, statusFilter]);

  const stats = data.stats || {};

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      
      {/* Top Banner / Header Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border-2 transition-all ${
        isDark 
          ? 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-slate-800 text-white' 
          : 'bg-gradient-to-r from-blue-50 via-sky-50 to-white border-blue-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Strict One-Attempt Security System</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-black tracking-tight">
              Manage Retake Permissions
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl font-medium">
              By default, candidates are restricted to strictly <strong>one official attempt</strong>. Once submitted, their exam locks automatically. Administrators can grant isolated single-retake authorization to specific candidates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchPermissionsData}
              disabled={loading}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-center cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Refresh Permissions Roster"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
            </button>
          </div>
        </div>

        {/* 4 Metric Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-6">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-xs'}`}>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Total Candidates
            </span>
            <div className="text-2xl sm:text-3xl font-heading font-black mt-1 text-blue-600 dark:text-blue-400">
              {stats.totalCandidates || (data.students || []).length}
            </div>
            <span className="text-[11px] text-slate-400">Enrolled Contestants</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-xs'}`}>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Completed & Locked
            </span>
            <div className="text-2xl sm:text-3xl font-heading font-black mt-1 text-amber-600 dark:text-amber-400">
              {(data.students || []).filter(s => s.rounds?.[1]?.isCompleted).length}
            </div>
            <span className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">Attempt Submitted</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-xs'}`}>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Retakes Authorized
            </span>
            <div className="text-2xl sm:text-3xl font-heading font-black mt-1 text-emerald-600 dark:text-emerald-400">
              {stats.activeGrantedCount || (data.permissions || []).filter(p => p.status === 'GRANTED').length}
            </div>
            <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-medium">Active Pass Tokens</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-xs'}`}>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
              Championship Stage
            </span>
            <div className="text-lg sm:text-xl font-heading font-black mt-2 text-indigo-600 dark:text-indigo-400 truncate">
              Single Round
            </div>
            <span className="text-[11px] text-indigo-500 font-medium">7 CS Subjects</span>
          </div>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center justify-between gap-3 animate-slideDown ${
          actionFeedback.type === 'success'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-700 dark:text-emerald-200'
            : 'bg-rose-50 border-rose-300 text-rose-900 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="font-semibold">{actionFeedback.message}</span>
          </div>
          <button 
            onClick={() => setActionFeedback(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl border-2 space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/90 shadow-sm'
      }`}>
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by Student ID, name, email or department..."
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-xs font-medium focus:outline-none transition-all ${
                isDark 
                  ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 shadow-sm'
              }`}
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                Clear
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter className="w-3.5 h-3.5" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
              }`}
            >
              <option value="All">All Candidates</option>
              <option value="Completed">Attempt Completed – Locked</option>
              <option value="PermissionGranted">Retake Access Granted</option>
              <option value="Pending">Pending First Attempt</option>
            </select>
          </div>
        </div>

        {/* Active Candidate Roster Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <th className="py-3 px-4">Student ID / Name</th>
                <th className="py-3 px-3">Department & Campus</th>
                <th className="py-3 px-3">Single Round Quiz Status</th>
                <th className="py-3 px-3">Official Attempts</th>
                <th className="py-3 px-4 text-right">Admin Retake Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-10 text-center text-slate-500 font-medium">
                    No matching candidates found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const rInfo = student.rounds?.[1] || {};
                  const isDone = Boolean(rInfo.isCompleted);
                  const hasPerm = Boolean(rInfo.hasRetakePermission);
                  const score = rInfo.score ?? 0;
                  const totalQuestions = rInfo.totalQuestions || 14;

                  return (
                    <tr 
                      key={student.studentId}
                      className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/40 transition-colors ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      {/* Candidate Profile */}
                      <td className="py-3.5 px-4 font-medium">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center shrink-0">
                            {student.fullName ? student.fullName.charAt(0).toUpperCase() : 'S'}
                          </div>
                          <div>
                            <div className="font-heading font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{student.fullName}</span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {student.studentId}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {student.email || 'student@comsats.edu.pk'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Department & Campus */}
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {student.department || 'Computer Science'}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {student.campus || 'Main Campus'}
                        </div>
                      </td>

                      {/* Single Round Status Badge */}
                      <td className="py-3.5 px-3">
                        {hasPerm ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold font-mono">
                            <Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>RETAKE ACCESS GRANTED</span>
                          </div>
                        ) : isDone ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 font-bold font-mono">
                            <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>ATTEMPT COMPLETED – LOCKED</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium font-mono">
                            <Clock className="w-3 h-3" />
                            <span>Pending First Attempt</span>
                          </span>
                        )}
                      </td>

                      {/* Official Attempts and Score */}
                      <td className="py-3.5 px-3">
                        {isDone ? (
                          <div className="font-mono">
                            <span className="font-black text-slate-900 dark:text-white">
                              {score} / {totalQuestions} pts
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              1 Official Attempt
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">
                            0 Attempts
                          </span>
                        )}
                      </td>

                      {/* Action: Grant / Revoke Retake Access */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {hasPerm ? (
                            <button
                              type="button"
                              onClick={() => {
                                const activeP = (data.permissions || []).find(
                                  p => p.studentId === student.studentId && p.status === 'GRANTED'
                                );
                                handleRevoke(activeP?.id, student.studentId, student.fullName);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                              title="Revoke active retake access"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>REVOKE</span>
                            </button>
                          ) : isDone ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentForGrant(student);
                                setGrantReason('Retake permission authorized by administrator');
                              }}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>GRANT RETAKE ACCESS</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStudentForGrant(student);
                                setGrantReason('Early retake authorization granted in advance');
                              }}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold text-[11px] transition cursor-pointer"
                            >
                              Authorize
                            </button>
                          )}
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

      {/* Grant Retake Access Modal */}
      {selectedStudentForGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border-2 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scaleIn ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Unlock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-lg">
                    Grant Quiz Retake Permission
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Target Candidate: <strong className="text-slate-900 dark:text-white">{selectedStudentForGrant.fullName}</strong> ({selectedStudentForGrant.studentId})
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedStudentForGrant(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGrant} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Competition Stage
                </label>
                <div className={`px-4 py-3 rounded-xl border-2 text-xs font-bold flex items-center gap-2 ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  <span>Battle of Brains – Single Combined Round (All 7 CS Subjects)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Administrative Reason / Approval Note
                </label>
                <textarea
                  rows={3}
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g. Technical disruption during first attempt, special proctor approval..."
                  className={`w-full p-3.5 rounded-xl border text-xs focus:outline-none transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                  required
                />
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Security & Audit Enforcement Notice:</span>
                </div>
                <p>
                  • Granting permission allows <strong>only this student</strong> one additional official attempt.
                </p>
                <p>
                  • Other students remain strictly locked. The round will automatically lock again after the retake is submitted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForGrant(null)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>{isSubmitting ? 'Granting...' : 'GRANT RETAKE ACCESS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retake History Audit Trail Card */}
      <div className={`p-6 rounded-3xl border-2 space-y-4 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="font-heading font-black text-base">
              Retake Permissions History & Audit Trail
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">
            {(data.permissions || []).length} Logged Approvals
          </span>
        </div>

        {(data.permissions || []).length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No retake permissions have been issued yet. All attempts remain in their default single-attempt state.
          </div>
        ) : (
          <div className="space-y-2.5">
            {(data.permissions || []).map((perm) => (
              <div 
                key={perm.id} 
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-heading font-black text-slate-900 dark:text-white">
                      {perm.studentName}
                    </span>
                    <span className="font-mono text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                      {perm.studentId}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      perm.status === 'GRANTED'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : perm.status === 'USED'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                    }`}>
                      {perm.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Reason: <span className="text-slate-700 dark:text-slate-300 font-medium">{perm.reason || 'Admin authorized retake'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-right">
                  <div className="text-[11px] text-slate-400 font-mono">
                    <div>By: {perm.grantedBy || 'ADMIN'}</div>
                    <div>{perm.grantedAt ? new Date(perm.grantedAt).toLocaleString() : 'Recent'}</div>
                  </div>

                  {perm.status === 'GRANTED' && (
                    <button
                      type="button"
                      onClick={() => handleRevoke(perm.id, perm.studentId, perm.studentName)}
                      className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold text-[11px] transition cursor-pointer"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
