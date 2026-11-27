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
  Zap, 
  FileText, 
  Check, 
  X,
  History,
  Sparkles,
  ChevronRight
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
  const [roundFilter, setRoundFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Completed' | 'PermissionGranted' | 'Pending'
  const [actionFeedback, setActionFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal / Grant Dialog State
  const [selectedStudentForGrant, setSelectedStudentForGrant] = useState(null);
  const [grantRound, setGrantRound] = useState(1);
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

  // Listen to storage sync for live multi-tab updates
  useEffect(() => {
    const handleStorageUpdate = (e) => {
      if (e.key === 'bob_retake_permissions' || e.key?.startsWith('bob_student_results_')) {
        fetchPermissionsData();
      }
    };
    window.addEventListener('storage', handleStorageUpdate);
    return () => window.removeEventListener('storage', handleStorageUpdate);
  }, []);

  const handleGrantSubmit = async (e) => {
    e?.preventDefault();
    if (!selectedStudentForGrant) return;

    setIsSubmitting(true);
    try {
      const res = await apiGrantRetakeAccess(
        selectedStudentForGrant.studentId,
        Number(grantRound),
        grantReason
      );

      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: `Retake access granted for ${selectedStudentForGrant.fullName} (Round 0${grantRound}).`
        });
        setSelectedStudentForGrant(null);
        await fetchPermissionsData();
      } else {
        setActionFeedback({
          type: 'error',
          message: res?.error || 'Failed to grant retake permission.'
        });
      }
    } catch (err) {
      setActionFeedback({ type: 'error', message: 'Network or server error granting retake access.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (permissionId, studentId, roundNum, studentName) => {
    if (!window.confirm(`Are you sure you want to revoke retake access for ${studentName || studentId} (Round 0${roundNum})?`)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiRevokeRetakeAccess(permissionId, studentId, roundNum);
      if (res && res.success) {
        setActionFeedback({
          type: 'success',
          message: `Retake access successfully revoked for ${studentName || studentId} (Round 0${roundNum}).`
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

      if (roundFilter !== 'All') {
        const rNum = Number(roundFilter);
        const rData = s.rounds?.[rNum];
        if (!rData || !rData.isCompleted) return false;
      }

      if (statusFilter === 'Completed') {
        const hasAnyCompleted = Object.values(s.rounds || {}).some((r) => r.isCompleted);
        if (!hasAnyCompleted) return false;
      } else if (statusFilter === 'PermissionGranted') {
        const hasAnyPerm = Object.values(s.rounds || {}).some((r) => r.hasRetakePermission);
        if (!hasAnyPerm) return false;
      } else if (statusFilter === 'Pending') {
        const allCompleted = Object.values(s.rounds || {}).every((r) => r.isCompleted);
        if (allCompleted) return false;
      }

      return true;
    });
  }, [data.students, search, roundFilter, statusFilter]);

  const stats = data.stats || {};

  return (
    <div className="space-y-6 animate-fadeIn text-slate-900">
      
      {/* Top Banner / Header Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border transition-all ${
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
            <h2 className="text-2xl sm:text-3xl font-heading font-black tracking-tight flex items-center gap-2.5">
              <span>Manage Retake Permissions</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl font-medium">
              By default, all candidates can take each competition round only once. Once submitted, the round is strictly locked. Administrators can grant one-time retake access for specific rounds.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchPermissionsData}
              disabled={loading}
              className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' 
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>
        </div>

        {/* Action Feedback Notification */}
        {actionFeedback && (
          <div className={`mt-4 p-3.5 rounded-2xl text-xs font-bold flex items-center justify-between gap-2 animate-fadeIn ${
            actionFeedback.type === 'success' 
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}>
            <div className="flex items-center gap-2">
              {actionFeedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{actionFeedback.message}</span>
            </div>
            <button onClick={() => setActionFeedback(null)} className="p-1 hover:opacity-75 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-sm'}`}>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Registered Candidates</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-heading text-blue-600">{stats.totalStudents || (data.students || []).length}</span>
              <span className="text-xs text-slate-500">Students</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-sm'}`}>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Active Unlocked Retakes</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-heading text-emerald-600">{stats.activeGrantedCount || 0}</span>
              <span className="text-xs text-emerald-700 font-semibold">Granted & Ready</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-sm'}`}>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Retakes Consumed</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-heading text-sky-600">{stats.usedCount || 0}</span>
              <span className="text-xs text-slate-500">Used Attempts</span>
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-blue-100 shadow-sm'}`}>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Revoked Access</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black font-heading text-rose-600">{stats.revokedCount || 0}</span>
              <span className="text-xs text-slate-500">Cancelled</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
      }`}>
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate by name, student ID, department or email..."
            className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium border outline-none transition-all ${
              isDark 
                ? 'bg-slate-950 border-slate-700 text-white placeholder-slate-500 focus:border-blue-500' 
                : 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-blue-600'
            }`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Round Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Round:</span>
            <select
              value={roundFilter}
              onChange={(e) => setRoundFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="All">All Rounds</option>
              <option value="1">Round 01: Screening</option>
              <option value="2">Round 02: Speed Test</option>
              <option value="3">Round 03: Rapid Fire</option>
              <option value="4">Round 04: Buzzer Final</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Has Completed Round(s)</option>
              <option value="PermissionGranted">Retake Granted (Unlocked)</option>
              <option value="Pending">Pending Attempts</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Candidates Roster Table */}
      <div className={`rounded-3xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white">
              Registered Contestants Round Attempts & Lock Status ({filteredStudents.length} Students)
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            One-Attempt Rule Active
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <th className="py-3 px-4">Student ID / Name</th>
                <th className="py-3 px-3">Round 01</th>
                <th className="py-3 px-3">Round 02</th>
                <th className="py-3 px-3">Round 03</th>
                <th className="py-3 px-3">Round 04</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-10 text-center text-slate-500 font-medium">
                    No matching candidates found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
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
                              {student.department} • {student.campus}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rounds 1 to 4 Status Badges */}
                      {[1, 2, 3, 4].map((rNum) => {
                        const rInfo = student.rounds?.[rNum];
                        const isDone = rInfo?.isCompleted;
                        const hasPerm = rInfo?.hasRetakePermission;

                        return (
                          <td key={rNum} className="py-3.5 px-3">
                            {hasPerm ? (
                              <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 font-bold font-mono">
                                <Unlock className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>RETAKE UNLOCKED</span>
                              </div>
                            ) : isDone ? (
                              <div className="inline-flex items-center gap-1 px-2 py-0.8 rounded-lg bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800 font-bold font-mono">
                                <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>LOCKED ({rInfo.score ?? 0} pts)</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400 font-mono">
                                Not Attempted
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {/* Action: Grant Retake Access */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If any round has an active granted permission, allow revoke */}
                          {Object.values(student.rounds || {}).some(r => r.hasRetakePermission) && (
                            <button
                              type="button"
                              onClick={() => {
                                const activeR = Object.values(student.rounds).find(r => r.hasRetakePermission);
                                if (activeR) {
                                  handleRevoke(activeR.retakePermission?.id, student.studentId, activeR.roundNumber, student.fullName);
                                }
                              }}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1"
                              title="Revoke active retake access"
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Revoke</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedStudentForGrant(student);
                              setGrantRound(1);
                              setGrantReason('Special exam retake authorized by administrator');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] cursor-pointer flex items-center gap-1.5"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            <span>GRANT RETAKE ACCESS</span>
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

      {/* Grant Retake Access Modal */}
      {selectedStudentForGrant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 animate-scaleIn ${
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
                  <p className="text-xs text-slate-500">
                    Target Candidate: <strong className="text-slate-900 dark:text-white">{selectedStudentForGrant.fullName}</strong> ({selectedStudentForGrant.studentId})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForGrant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantSubmit} className="space-y-4">
              <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-xs text-sky-800 dark:text-sky-300">
                Granting permission will unlock <strong>only this specific round</strong> for <strong>one additional attempt</strong>. All other rounds and student accounts remain securely locked.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Competition Round:
                </label>
                <select
                  value={grantRound}
                  onChange={(e) => setGrantRound(Number(e.target.value))}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold border outline-none cursor-pointer ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value={1}>Round 01: Screening MCQs</option>
                  <option value={2}>Round 02: Speed Test</option>
                  <option value={3}>Round 03: Rapid Fire</option>
                  <option value={4}>Round 04: Buzzer Final</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Administrative Reason / Note:
                </label>
                <textarea
                  rows="3"
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="e.g., Browser disconnected accidentally, approved by chief examiner..."
                  className={`w-full p-3.5 rounded-xl text-xs font-medium border outline-none ${
                    isDark ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedStudentForGrant(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-heading font-black text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Granting...' : 'CONFIRM & GRANT RETAKE ACCESS'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Retake Audit Logs Table */}
      <div className={`rounded-3xl border overflow-hidden shadow-sm ${
        isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
      }`}>
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="font-heading font-black text-sm sm:text-base text-slate-900 dark:text-white">
              Retake Permissions Audit History ({data.permissions?.length || 0} Records)
            </h3>
          </div>
          <span className="text-xs text-slate-500">Immutable Log</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                isDark ? 'bg-slate-950/70 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}>
                <th className="py-3 px-4">Permission ID</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-3">Round</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Granted At / By</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {(!data.permissions || data.permissions.length === 0) ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500 font-medium">
                    No retake permission actions recorded yet. All rounds are strictly locked on first submission.
                  </td>
                </tr>
              ) : (
                data.permissions.map((perm) => (
                  <tr key={perm.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-slate-600 dark:text-slate-400">
                      {perm.id}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <strong>{perm.studentName}</strong> ({perm.studentId})
                    </td>
                    <td className="py-3 px-3 font-mono font-bold">
                      Round 0{perm.roundNumber}
                    </td>
                    <td className="py-3 px-3">
                      {perm.status === 'GRANTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                          Active Unlocked
                        </span>
                      ) : perm.status === 'USED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300">
                          Attempt Used
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">
                      <div>{perm.grantedAt ? new Date(perm.grantedAt).toLocaleString() : 'N/A'}</div>
                      <div className="font-mono text-[10px] text-slate-400">By: {perm.grantedBy || 'ADMIN'}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300 text-[11px] max-w-xs truncate">
                      {perm.reason || 'No reason provided'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}