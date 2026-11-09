import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  Eye, 
  Pencil, 
  Download, 
  Save, 
  X, 
  RefreshCw,
  Building2,
  Mail,
  Phone,
  IdCard,
  UserCheck,
  GraduationCap,
  ArrowRight,
  Send,
  Calendar,
  MapPin,
  Clock4,
  CheckSquare,
  Square,
  History,
  Sparkles,
  Inbox
} from 'lucide-react';
import { 
  apiGetRegistrations, 
  apiUpdateRegistrationStatus, 
  apiUpdateParticipant, 
  apiDeleteParticipant,
  apiGetSemesterCohorts,
  apiPromoteStudentSemester,
  apiGetOutboxEmails
} from '../../utils/api';

export default function RegistrationManager({ isDark }) {
  const [activeTab, setActiveTab] = useState('registrations'); // 'registrations' | 'cohorts' | 'outbox'
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [deptFilter, setDeptFilter] = useState('All');

  // Semester Progression state
  const [cohortsData, setCohortsData] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState('All');
  const [selectedStudentsForPromotion, setSelectedStudentsForPromotion] = useState([]);
  const [targetSemester, setTargetSemester] = useState('5th Semester');
  const [promotionLoading, setPromotionLoading] = useState(false);

  // Email Outbox state
  const [outboxEmails, setOutboxEmails] = useState([]);
  const [viewEmail, setViewEmail] = useState(null);

  // Modal states
  const [viewStudent, setViewStudent] = useState(null);
  const [editStudent, setEditStudent] = useState(null);
  const [actionPrompt, setActionPrompt] = useState(null); // { id, action: 'Reject' | 'Correction_Requested', note: '' }
  const [statusMessage, setStatusMessage] = useState({ text: '', isError: false });

  const fetchRegistrations = async () => {
    setLoading(true);
    try {
      const data = await apiGetRegistrations({
        status: statusFilter,
        search,
        department: deptFilter,
      });
      if (Array.isArray(data)) {
        setRegistrations(data);
      }
    } catch (err) {
      console.error('Error fetching registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCohorts = async () => {
    setLoading(true);
    try {
      const data = await apiGetSemesterCohorts();
      if (data && data.cohorts) {
        setCohortsData(data.cohorts);
      }
    } catch (err) {
      console.error('Error fetching cohorts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchOutbox = async () => {
    setLoading(true);
    try {
      const data = await apiGetOutboxEmails();
      if (Array.isArray(data)) {
        setOutboxEmails(data);
      }
    } catch (err) {
      console.error('Error fetching email outbox:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchRegistrations();
    } else if (activeTab === 'cohorts') {
      fetchCohorts();
    } else if (activeTab === 'outbox') {
      fetchOutbox();
    }
  }, [activeTab, statusFilter, deptFilter]);

  const handlePromoteCohort = async () => {
    if (selectedStudentsForPromotion.length === 0) {
      setStatusMessage({ text: 'Please select at least one student to promote.', isError: true });
      return;
    }
    setPromotionLoading(true);
    try {
      const res = await apiPromoteStudentSemester(selectedStudentsForPromotion, targetSemester);
      if (res.success) {
        setStatusMessage({ text: res.message || `Promoted to ${targetSemester}!`, isError: false });
        setSelectedStudentsForPromotion([]);
        fetchCohorts();
        fetchRegistrations();
      } else {
        setStatusMessage({ text: res.error || 'Promotion failed.', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: err.message, isError: true });
    } finally {
      setPromotionLoading(false);
    }
  };

  const handleToggleSelectStudent = (id) => {
    if (selectedStudentsForPromotion.includes(id)) {
      setSelectedStudentsForPromotion(selectedStudentsForPromotion.filter(sId => sId !== id));
    } else {
      setSelectedStudentsForPromotion([...selectedStudentsForPromotion, id]);
    }
  };

  const handleSelectAllInSemester = (students) => {
    const ids = students.map(s => s.id);
    const allSelected = ids.every(id => selectedStudentsForPromotion.includes(id));
    if (allSelected) {
      setSelectedStudentsForPromotion(selectedStudentsForPromotion.filter(id => !ids.includes(id)));
    } else {
      const newSet = new Set([...selectedStudentsForPromotion, ...ids]);
      setSelectedStudentsForPromotion(Array.from(newSet));
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRegistrations();
  };

  const handleStatusChange = async (id, status, notes = '') => {
    try {
      const res = await apiUpdateRegistrationStatus(id, status, notes);
      if (res.success) {
        setStatusMessage({ text: `Registration status updated to ${status}!`, isError: false });
        fetchRegistrations();
        setActionPrompt(null);
      } else {
        setStatusMessage({ text: res.error || 'Status update failed.', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: err.message, isError: true });
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editStudent) return;
    try {
      const res = await apiUpdateParticipant(editStudent.id, editStudent);
      if (res.success) {
        setStatusMessage({ text: 'Participant details updated successfully!', isError: false });
        setEditStudent(null);
        fetchRegistrations();
      } else {
        setStatusMessage({ text: res.error || 'Failed to update participant.', isError: true });
      }
    } catch (err) {
      setStatusMessage({ text: err.message, isError: true });
    }
  };

  const exportCSV = () => {
    if (registrations.length === 0) return;
    const headers = ["Pass Ref", "Student ID", "Full Name", "University", "Campus", "Region", "Email", "Phone", "Degree", "Semester", "Status", "Registered At"];
    const rows = registrations.map((r) => [
      `"${r.id}"`,
      `"${r.studentId}"`,
      `"${r.fullName}"`,
      `"${r.universityName || 'COMSATS'}"`,
      `"${r.campus || ''}"`,
      `"${r.region || ''}"`,
      `"${r.email}"`,
      `"${r.phone}"`,
      `"${r.department || r.degreeProgram || ''}"`,
      `"${r.semester}"`,
      `"${r.registrationStatus || 'Approved'}"`,
      `"${r.registeredAt || ''}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `BOB_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const stats = {
    total: registrations.length,
    approved: registrations.filter((r) => (r.registrationStatus || 'Approved') === 'Approved').length,
    pending: registrations.filter((r) => r.registrationStatus === 'Pending').length,
    rejected: registrations.filter((r) => r.registrationStatus === 'Rejected').length,
    corrections: registrations.filter((r) => r.registrationStatus === 'Correction_Requested').length,
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* View Switcher Tabs (Registrations | Semester Progression | Automated Emails) */}
      <div className={`p-1.5 rounded-2xl border flex items-center gap-1.5 ${
        isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-slate-100 border-slate-200'
      }`}>
        <button
          onClick={() => setActiveTab('registrations')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'registrations'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Active Registrations</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/25">
            {registrations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('cohorts')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'cohorts'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Semester Cohorts & Progression</span>
        </button>

        <button
          onClick={() => setActiveTab('outbox')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-heading font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'outbox'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
              : isDark ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Inbox className="w-4 h-4" />
          <span>Automated Email Outbox</span>
          <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-black/25">
            {outboxEmails.length}
          </span>
        </button>
      </div>

      {statusMessage.text && (
        <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between ${
          statusMessage.isError ? 'bg-rose-500/15 border border-rose-500/30 text-rose-300' : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
        }`}>
          <span>{statusMessage.text}</span>
          <button onClick={() => setStatusMessage({ text: '', isError: false })}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: ACTIVE REGISTRATIONS VIEW                        */}
      {/* ======================================================== */}
      {activeTab === 'registrations' && (
        <div className="space-y-6">
          {/* Header and Summary Cards */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className={`text-xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Individual Registration Management
                </h3>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                  Review, approve, reject, or request corrections for student individual competition enrollments.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={exportCSV}
                  className="px-3.5 py-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-heading font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
                <button
                  onClick={fetchRegistrations}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                    isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                  title="Refresh Registry"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-500' : ''}`} />
                </button>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-heading font-semibold text-slate-400 uppercase tracking-wider">Total</span>
                <div className="text-xl font-heading font-black text-blue-400 mt-0.5">{stats.total}</div>
              </div>
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-heading font-semibold text-emerald-400 uppercase tracking-wider">Approved</span>
                <div className="text-xl font-heading font-black text-emerald-400 mt-0.5">{stats.approved}</div>
              </div>
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-heading font-semibold text-amber-400 uppercase tracking-wider">Pending</span>
                <div className="text-xl font-heading font-black text-amber-400 mt-0.5">{stats.pending}</div>
              </div>
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-heading font-semibold text-rose-400 uppercase tracking-wider">Rejected</span>
                <div className="text-xl font-heading font-black text-rose-400 mt-0.5">{stats.rejected}</div>
              </div>
              <div className={`p-3.5 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                <span className="text-[10px] font-heading font-semibold text-purple-400 uppercase tracking-wider">Corrections</span>
                <div className="text-xl font-heading font-black text-purple-400 mt-0.5">{stats.corrections}</div>
              </div>
            </div>
          </div>

          {/* Filter and Search Bar */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row gap-3 items-center justify-between ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by student name, Student ID, Pass Ref, or Email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs border focus:outline-none ${
                  isDark ? 'bg-black/50 border-white/10 text-white focus:border-blue-500' : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                }`}
              />
            </form>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="All">All Statuses</option>
                <option value="Approved">Approved</option>
                <option value="Pending">Pending</option>
                <option value="Correction_Requested">Correction Requested</option>
                <option value="Rejected">Rejected</option>
              </select>

              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl text-xs border focus:outline-none ${
                  isDark ? 'bg-black/50 border-white/10 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              >
                <option value="All">All Departments</option>
                <option value="Computer Science">Computer Science</option>
                <option value="Software Engineering">Software Engineering</option>
                <option value="Artificial Intelligence">Artificial Intelligence</option>
                <option value="Cyber Security">Cyber Security</option>
                <option value="Data Science">Data Science</option>
              </select>
            </div>
          </div>

          {/* Registrations Data Table */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-800 bg-[#090f1d]' : 'border-slate-200 bg-white'}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800 bg-black/40 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <th className="p-3.5 font-heading font-bold">Pass Reference</th>
                    <th className="p-3.5 font-heading font-bold">Student Name & ID</th>
                    <th className="p-3.5 font-heading font-bold">Institution / Campus</th>
                    <th className="p-3.5 font-heading font-bold">Program & Semester</th>
                    <th className="p-3.5 font-heading font-bold">Status</th>
                    <th className="p-3.5 font-heading font-bold text-right">Adjudication Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {registrations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No student registrations match current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    registrations.map((student) => {
                      const status = student.registrationStatus || 'Approved';
                      return (
                        <tr key={student.id} className={`border-b transition-colors ${isDark ? 'border-slate-800/80 hover:bg-white/[0.02] text-slate-200' : 'border-slate-200 hover:bg-slate-50 text-slate-900'}`}>
                          <td className="p-3.5 font-mono font-black text-blue-600 dark:text-blue-400">
                            {student.id}
                          </td>
                          <td className="p-3.5">
                            <div className={`font-heading font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>{student.fullName}</div>
                            <div className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{student.studentId}</div>
                          </td>
                          <td className="p-3.5">
                            <div className={`truncate max-w-[160px] font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{student.universityName || 'COMSATS Islamabad'}</div>
                            <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{student.campus || 'Islamabad'} • {student.region || 'Federal'}</div>
                          </td>
                          <td className="p-3.5">
                            <div className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{student.department || student.degreeProgram}</div>
                            <div className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{student.semester}</div>
                          </td>
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                              status === 'Approved'
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : status === 'Pending'
                                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                  : status === 'Correction_Requested'
                                    ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            }`}>
                              {status === 'Approved' && <CheckCircle2 className="w-3 h-3" />}
                              {status === 'Pending' && <Clock className="w-3 h-3" />}
                              {status === 'Rejected' && <XCircle className="w-3 h-3" />}
                              <span>{status}</span>
                            </span>
                            {student.adminNotes && (
                              <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[120px]">
                                {student.adminNotes}
                              </div>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            <button
                              onClick={() => setViewStudent(student)}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
                              title="View Full Profile"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setEditStudent(student)}
                              className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-colors cursor-pointer"
                              title="Edit Student Info"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {status !== 'Approved' && (
                              <button
                                onClick={() => handleStatusChange(student.id, 'Approved')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-[11px] font-heading font-semibold border border-emerald-500/30 transition-colors cursor-pointer"
                              >
                                Approve
                              </button>
                            )}

                            {status !== 'Rejected' && (
                              <button
                                onClick={() => setActionPrompt({ id: student.id, studentName: student.fullName, action: 'Rejected', note: '' })}
                                className="px-2.5 py-1 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-[11px] font-heading font-semibold border border-rose-500/30 transition-colors cursor-pointer"
                              >
                                Reject
                              </button>
                            )}

                            {status !== 'Correction_Requested' && (
                              <button
                                onClick={() => setActionPrompt({ id: student.id, studentName: student.fullName, action: 'Correction_Requested', note: '' })}
                                className="px-2 py-1 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-[10px] font-heading font-semibold border border-purple-500/30 transition-colors cursor-pointer"
                              >
                                Correction
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SEMESTER COHORTS & PROGRESSION VIEW               */}
      {/* ======================================================== */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 mb-2">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Academic Semester Progression Engine</span>
              </div>
              <h3 className={`text-xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Semester Cohorts & Student Transition History
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                Track students passing from one semester to the next, inspect previous vs next cohort details, and promote cohorts.
              </p>
            </div>

            <button
              onClick={fetchCohorts}
              className={`p-2 rounded-xl border transition-colors cursor-pointer self-start sm:self-auto ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Refresh Cohorts"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
          </div>

          {/* Semester Cohort Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <button
              onClick={() => setSelectedSemester('All')}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedSemester === 'All'
                  ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/20'
                  : isDark ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-slate-400">All Students</span>
              <div className="text-xl font-heading font-black text-indigo-400 mt-0.5">{registrations.length}</div>
              <span className="text-[10px] text-slate-500">Master Roster</span>
            </button>

            {cohortsData.map((cohort) => {
              const isSelected = selectedSemester === cohort.semester;
              return (
                <button
                  key={cohort.semester}
                  onClick={() => setSelectedSemester(cohort.semester)}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/20'
                      : isDark ? 'border-slate-800 bg-slate-900/60 hover:border-slate-700' : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <span className={`text-[10px] font-heading font-bold uppercase tracking-wider truncate block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {cohort.semester}
                  </span>
                  <div className={`text-xl font-heading font-black mt-0.5 ${isDark ? 'text-white' : 'text-slate-950'}`}>{cohort.count}</div>
                  <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-600'}`}>Active Students</span>
                </button>
              );
            })}
          </div>

          {/* Promotion Control Toolbar */}
          <div className={`p-4 rounded-xl border flex flex-col md:flex-row gap-4 items-center justify-between ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
          }`}>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className={`text-xs font-heading font-black ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                Selected for Promotion:
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border shadow-sm ${
                isDark ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40' : 'bg-indigo-100 text-indigo-900 border-indigo-300'
              }`}>
                {selectedStudentsForPromotion.length} students
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Promote to:</span>
                <select
                  value={targetSemester}
                  onChange={(e) => setTargetSemester(e.target.value)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none ${
                    isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900 shadow-sm'
                  }`}
                >
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="3rd Semester">3rd Semester</option>
                  <option value="4th Semester">4th Semester</option>
                  <option value="5th Semester">5th Semester</option>
                  <option value="6th Semester">6th Semester</option>
                  <option value="7th Semester">7th Semester</option>
                  <option value="8th Semester">8th Semester</option>
                  <option value="Alumni / Graduated">Alumni / Graduated</option>
                </select>
              </div>

              <button
                onClick={handlePromoteCohort}
                disabled={promotionLoading || selectedStudentsForPromotion.length === 0}
                className={`px-4 py-2 rounded-xl text-xs font-heading font-black flex items-center gap-2 transition-all cursor-pointer ${
                  selectedStudentsForPromotion.length > 0 && !promotionLoading
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    : isDark ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                }`}
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{promotionLoading ? 'Promoting...' : `Advance to ${targetSemester}`}</span>
              </button>
            </div>
          </div>

          {/* Student Roster & Semester Progression Details */}
          {(() => {
            const displayedStudents = selectedSemester === 'All'
              ? registrations
              : (cohortsData.find(c => c.semester === selectedSemester)?.students || []);

            return (
              <div className={`rounded-2xl border-2 overflow-hidden shadow-lg transition-all ${
                isDark ? 'border-slate-800 bg-[#090f1d]' : 'border-slate-300 bg-white'
              }`}>
                <div className={`p-4 border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 bg-slate-900/90 text-white' : 'border-slate-200 bg-slate-100 text-slate-900'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => handleSelectAllInSemester(displayedStudents)}
                      className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                        isDark ? 'text-slate-300 hover:text-white hover:bg-slate-800' : 'text-slate-700 hover:text-slate-950 hover:bg-slate-200'
                      }`}
                      title="Select / Unselect All in this View"
                    >
                      {displayedStudents.length > 0 && displayedStudents.every(s => selectedStudentsForPromotion.includes(s.id)) ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                    <span className={`font-heading font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      {selectedSemester === 'All' ? 'All Registered Students' : `${selectedSemester} Cohort`} ({displayedStudents.length})
                    </span>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    Check students to advance them to the next academic cycle
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className={`border-b ${
                        isDark ? 'border-slate-800 bg-slate-950/70 text-slate-300' : 'border-slate-300 bg-slate-100 text-slate-900 font-black'
                      }`}>
                        <th className="p-3.5 w-10 text-center font-heading font-black">Select</th>
                        <th className="p-3.5 font-heading font-black text-sm">Student Name & ID</th>
                        <th className="p-3.5 font-heading font-black text-sm">Department / Program</th>
                        <th className="p-3.5 font-heading font-black text-sm">Current Semester</th>
                        <th className="p-3.5 font-heading font-black text-sm">Semester Progression History</th>
                        <th className="p-3.5 font-heading font-black text-sm text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? 'divide-slate-800' : 'divide-slate-200'}`}>
                      {displayedStudents.length === 0 ? (
                        <tr>
                          <td colSpan={6} className={`p-8 text-center font-bold text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                            No students currently recorded in {selectedSemester}.
                          </td>
                        </tr>
                      ) : (
                        displayedStudents.map((s) => {
                          const isChecked = selectedStudentsForPromotion.includes(s.id);
                          const history = s.semesterHistory || [];
                          return (
                            <tr
                              key={s.id}
                              className={`border-b transition-colors ${
                                isChecked
                                  ? isDark ? 'bg-indigo-950/50 border-indigo-500/40' : 'bg-indigo-50/90 border-indigo-200'
                                  : isDark ? 'border-slate-800/80 hover:bg-slate-900/60' : 'border-slate-200 hover:bg-slate-50/80'
                              }`}
                            >
                              <td className="p-3.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleSelectStudent(s.id)}
                                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                                />
                              </td>
                              <td className="p-3.5">
                                <div className={`font-heading font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>
                                  {s.fullName}
                                </div>
                                <div className={`text-xs font-mono font-bold mt-0.5 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                  {s.studentId} <span className={isDark ? 'text-slate-400 font-normal' : 'text-slate-600 font-semibold'}>• {s.email}</span>
                                </div>
                              </td>
                              <td className="p-3.5">
                                <div className={`font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                                  {s.department || s.degreeProgram || 'Computer Science'}
                                </div>
                                <div className={`text-xs font-semibold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                  {s.campus || 'Islamabad Campus'}
                                </div>
                              </td>
                              <td className="p-3.5">
                                <span className={`px-3 py-1 rounded-full text-xs font-mono font-black border shadow-sm ${
                                  isDark
                                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                                    : 'bg-indigo-100 text-indigo-950 border-indigo-300 font-black'
                                }`}>
                                  {s.semester || 'Unassigned'}
                                </span>
                              </td>
                              <td className="p-3.5">
                                {history.length === 0 ? (
                                  <span className={`text-xs italic font-semibold ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                                    Initial enrollment in <strong className={isDark ? 'text-slate-200' : 'text-slate-950'}>{s.semester || '1st Semester'}</strong>
                                  </span>
                                ) : (
                                  <div className="space-y-1.5">
                                    {history.map((h, hIdx) => (
                                      <div key={hIdx} className={`flex items-center gap-1.5 text-xs font-mono font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>
                                        <History className={`w-3.5 h-3.5 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`} />
                                        <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{h.fromSemester}</span>
                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                        <span className={`font-black ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>{h.toSemester}</span>
                                        <span className={`text-[10px] font-medium ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                                          ({new Date(h.promotedAt).toLocaleDateString()})
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-3.5 text-right">
                                <button
                                  onClick={async () => {
                                    const next = targetSemester;
                                    const res = await apiPromoteStudentSemester([s.id], next);
                                    if (res.success) {
                                      setStatusMessage({ text: `${s.fullName} promoted to ${next}!`, isError: false });
                                      fetchCohorts();
                                      fetchRegistrations();
                                    }
                                  }}
                                  className={`px-3 py-1.5 rounded-xl border text-xs font-heading font-black transition-all cursor-pointer shadow-sm ${
                                    isDark
                                      ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 border-indigo-500/40'
                                      : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 shadow-indigo-600/30'
                                  }`}
                                >
                                  Advance to {targetSemester}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: AUTOMATED EMAIL NOTIFICATION OUTBOX              */}
      {/* ======================================================== */}
      {activeTab === 'outbox' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 mb-2">
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Automated Email Notification System</span>
              </div>
              <h3 className={`text-xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Dispatched Student Notification Outbox
              </h3>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
                Official test dates, reporting times, pass references, and venue instructions auto-delivered to each student's email upon registration.
              </p>
            </div>

            <button
              onClick={fetchOutbox}
              className={`p-2 rounded-xl border transition-colors cursor-pointer self-start sm:self-auto ${
                isDark ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white' : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
              title="Refresh Outbox"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
            </button>
          </div>

          {/* Outbox Metrics Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-heading font-semibold">
                <Send className="w-4 h-4 text-emerald-400" />
                <span>Total Dispatched Letters</span>
              </div>
              <div className="text-2xl font-heading font-black text-white mt-1">
                {outboxEmails.length}
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">100% Automated Instant Dispatch</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-heading font-semibold">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Official Test Date</span>
              </div>
              <div className="text-base font-heading font-bold text-white mt-1">
                November 12, 2026
              </div>
              <span className="text-[10px] text-slate-400 font-mono">Reporting: 08:50 AM PST</span>
            </div>

            <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-heading font-semibold">
                <MapPin className="w-4 h-4 text-amber-400" />
                <span>Designated Examination Venue</span>
              </div>
              <div className="text-base font-heading font-bold text-white mt-1 truncate">
                COMSATS Main Auditorium & Lab Complex
              </div>
              <span className="text-[10px] text-amber-300 font-mono">Full Physical & Network Proctoring</span>
            </div>
          </div>

          {/* Outbox Table */}
          <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-800 bg-[#090f1d]' : 'border-slate-200 bg-white'}`}>
            <div className="p-4 border-b flex items-center justify-between border-white/5 bg-black/40">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-emerald-400" />
                <span className="font-heading font-bold text-white text-xs">
                  Automated Outbox Log ({outboxEmails.length} notifications)
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Auto-triggered upon student portal registration
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? 'border-slate-800 bg-black/20 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                    <th className="p-3.5 font-heading font-bold">Recipient Student</th>
                    <th className="p-3.5 font-heading font-bold">Email Subject</th>
                    <th className="p-3.5 font-heading font-bold">Scheduled Test Details</th>
                    <th className="p-3.5 font-heading font-bold">Status</th>
                    <th className="p-3.5 font-heading font-bold">Dispatch Timestamp</th>
                    <th className="p-3.5 font-heading font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {outboxEmails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        No automated outbox emails recorded yet. New student registrations will automatically log notifications here.
                      </td>
                    </tr>
                  ) : (
                    outboxEmails.map((email) => (
                      <tr key={email.id} className={`border-b transition-colors ${isDark ? 'border-slate-800 hover:bg-white/[0.02]' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <td className="p-3.5">
                          <div className={`font-heading font-black text-sm ${isDark ? 'text-white' : 'text-slate-950'}`}>{email.recipientName || 'Student Participant'}</div>
                          <div className={`text-xs font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{email.to}</div>
                        </td>
                        <td className={`p-3.5 font-bold text-xs ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {email.subject}
                        </td>
                        <td className="p-3.5">
                          <div className={`font-mono font-bold text-xs ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>{email.testDate || 'Nov 12, 2026'} • {email.reportingTime || '08:50 AM PST'}</div>
                          <div className={`text-[11px] font-medium truncate max-w-[200px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{email.venue || 'COMSATS Main Auditorium'}</div>
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>{email.status || 'Delivered'}</span>
                          </span>
                        </td>
                        <td className="p-3.5 font-mono text-[11px] text-slate-400">
                          {email.sentAt ? new Date(email.sentAt).toLocaleString() : 'Just now'}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setViewEmail(email)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-heading font-bold flex items-center gap-1.5 ml-auto transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View Letter</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW EMAIL PREVIEW MODAL */}
      {viewEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1020] border border-emerald-500/40 p-6 sm:p-7 max-w-xl w-full rounded-2xl shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-emerald-400" />
                <h4 className="font-heading font-bold text-white text-base">Official Automated Notification Letter</h4>
              </div>
              <button onClick={() => setViewEmail(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 rounded-xl bg-black/60 border border-white/10 space-y-3 text-xs">
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">To:</span>
                <span className="font-mono text-emerald-300 font-bold">{viewEmail.to}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Subject:</span>
                <span className="text-white font-bold">{viewEmail.subject}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Test Schedule:</span>
                <span className="text-blue-300 font-mono font-bold">{viewEmail.testDate || 'Nov 12, 2026'} at {viewEmail.reportingTime || '08:50 AM PST'}</span>
              </div>
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Venue:</span>
                <span className="text-white">{viewEmail.venue || 'COMSATS Main Auditorium & Lab Complex'}</span>
              </div>

              <div className="p-4 rounded-lg bg-slate-900 border border-emerald-500/20 text-slate-200 text-xs leading-relaxed whitespace-pre-line font-sans">
                {viewEmail.body || (
                  `Dear Candidate,

Your official registration for Battle of Brains 2026 is confirmed.
Admit Pass Reference: ${viewEmail.admitReference || 'CONFIRMED'}
Examination Date: ${viewEmail.testDate || 'November 12, 2026'}
Reporting Time: ${viewEmail.reportingTime || '08:50 AM PST Sharp'}
Venue: ${viewEmail.venue || 'COMSATS Main Auditorium & Lab Complex'}

Please ensure you bring your original university student ID card. 
Any unauthorized screen opening, background application, or tab switching during the test will trigger an automated high-decibel proctor siren on the admin console and result in instant disqualification.

Best regards,
Battle of Brains 2026 Examination Committee
COMSATS University Islamabad`
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewEmail(null)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-heading font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW FULL PROFILE MODAL */}
      {viewStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1020] border border-blue-500/40 p-6 sm:p-7 max-w-lg w-full rounded-2xl shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <IdCard className="w-5 h-5 text-blue-400" />
                <h4 className="font-heading font-bold text-white text-base">Complete Contestant Profile</h4>
              </div>
              <button onClick={() => setViewStudent(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-black/50 border border-white/10 rounded-xl p-4 text-xs space-y-2.5 text-slate-300">
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Pass Reference:</span>
                <span className="font-mono font-bold text-blue-400">{viewStudent.id}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Full Name:</span>
                <strong className="text-white">{viewStudent.fullName}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Student ID:</span>
                <strong className="font-mono text-white">{viewStudent.studentId}</strong>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">University / Institution:</span>
                <span>{viewStudent.universityName || 'COMSATS University'}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Campus & Region:</span>
                <span>{viewStudent.campus} • {viewStudent.region}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Official Email:</span>
                <span className="font-mono text-[11px]">{viewStudent.email}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Contact Number:</span>
                <span className="font-mono text-[11px]">{viewStudent.phone}</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Degree & Semester:</span>
                <span>{viewStudent.department || viewStudent.degreeProgram} ({viewStudent.semester})</span>
              </div>
              <div className="flex justify-between border-b border-white/5 pb-1.5">
                <span className="text-slate-400">Registration Status:</span>
                <strong className="text-emerald-400">{viewStudent.registrationStatus || 'Approved'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Enrolled Timestamp:</span>
                <span>{viewStudent.registeredAt ? new Date(viewStudent.registeredAt).toLocaleString() : 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setViewStudent(null)}
                className="px-5 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT STUDENT INFO MODAL */}
      {editStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1020] border border-blue-500/40 p-6 sm:p-7 max-w-md w-full rounded-2xl shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="font-heading font-bold text-white text-base">Edit Permitted Student Info</h4>
              <button onClick={() => setEditStudent(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={editStudent.fullName}
                  onChange={(e) => setEditStudent({ ...editStudent, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={editStudent.phone}
                  onChange={(e) => setEditStudent({ ...editStudent, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Academic Department</label>
                <input
                  type="text"
                  value={editStudent.department}
                  onChange={(e) => setEditStudent({ ...editStudent, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Semester</label>
                <input
                  type="text"
                  value={editStudent.semester}
                  onChange={(e) => setEditStudent({ ...editStudent, semester: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setEditStudent(null)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-heading font-bold hover:bg-blue-600 flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACTION REASON / NOTE PROMPT MODAL (Reject or Request Correction) */}
      {actionPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#0b1020] border border-blue-500/40 p-6 sm:p-7 max-w-md w-full rounded-2xl shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h4 className="font-heading font-bold text-white text-base">
                {actionPrompt.action === 'Rejected' ? 'Reject Registration' : 'Request Correction'}
              </h4>
              <button onClick={() => setActionPrompt(null)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <p className="text-xs text-slate-300">
              Please enter the official reason or instruction for student <strong className="text-white">{actionPrompt.studentName}</strong>:
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Invalid Student ID provided or duplicate email address..."
              value={actionPrompt.note}
              onChange={(e) => setActionPrompt({ ...actionPrompt, note: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs focus:outline-none focus:border-blue-500"
            />

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setActionPrompt(null)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange(actionPrompt.id, actionPrompt.action, actionPrompt.note)}
                className={`px-5 py-2 rounded-xl text-white text-xs font-heading font-bold transition-colors ${
                  actionPrompt.action === 'Rejected' ? 'bg-rose-600 hover:bg-rose-500' : 'bg-purple-600 hover:bg-purple-500'
                }`}
              >
                Confirm {actionPrompt.action === 'Rejected' ? 'Rejection' : 'Correction'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
