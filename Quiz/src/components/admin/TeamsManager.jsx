import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Crown, 
  Phone, 
  Copy, 
  Check, 
  Trash2, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  IdCard,
  UserCheck,
  Plus,
  X,
  Lock,
  Mail,
  UserPlus
} from 'lucide-react';
import { apiGetAllTeams, apiFinalizeTeam, apiAdminCreateTeam, apiDeleteTeam } from '../../utils/api';
import { getStoredTeams, localFinalizeTeam } from '../../utils/storage';

export default function TeamsManager({ isDark }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [copiedCode, setCopiedCode] = useState(null);

  // Add Team Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');
  const [formTargetSize, setFormTargetSize] = useState(3);
  const [teamNameInput, setTeamNameInput] = useState('');

  // Leader details
  const [leaderName, setLeaderName] = useState('');
  const [leaderEmail, setLeaderEmail] = useState('');
  const [leaderMobile, setLeaderMobile] = useState('');
  const [leaderPass, setLeaderPass] = useState('');

  // Member 2 details
  const [m2Name, setM2Name] = useState('');
  const [m2Email, setM2Email] = useState('');
  const [m2Mobile, setM2Mobile] = useState('');
  const [m2Pass, setM2Pass] = useState('');

  // Member 3 details (Optional if 3 members)
  const [m3Name, setM3Name] = useState('');
  const [m3Email, setM3Email] = useState('');
  const [m3Mobile, setM3Mobile] = useState('');
  const [m3Pass, setM3Pass] = useState('');

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const data = await apiGetAllTeams();
      if (Array.isArray(data)) {
        setTeams(data);
      } else {
        setTeams(getStoredTeams() || []);
      }
    } catch {
      setTeams(getStoredTeams() || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleCopy = (code) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleAdminFinalize = async (team) => {
    const tName = typeof team === 'object' ? team.name : team;
    const tId = typeof team === 'object' ? team.id : undefined;
    if (!window.confirm(`Force confirm and lock registration for team "${tName}"?`)) return;
    try {
      await apiFinalizeTeam(tName, tId);
    } catch {}
    localFinalizeTeam(tName, tId);
    fetchTeams();
  };

  const handleDeleteTeam = async (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to permanently delete team "${teamName}"? All team members will be unlinked.`)) return;
    try {
      const res = await apiDeleteTeam(teamId);
      if (res && res.error) {
        alert(res.error);
        return;
      }
      setTeams(prev => prev.filter(t => t.id !== teamId && t.name !== teamName));
      fetchTeams();
    } catch (e) {
      alert(e.message || 'Failed to delete team');
    }
  };

  const handleCreateTeamSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!teamNameInput.trim()) {
      setCreateError('Team Name is strictly required.');
      return;
    }
    if (!leaderName.trim() || !leaderMobile.trim() || !leaderPass.trim()) {
      setCreateError('Team Leader Full Name, Mobile, and Password are required.');
      return;
    }
    if (!m2Name.trim() || !m2Mobile.trim() || !m2Pass.trim()) {
      setCreateError('Member 2 Full Name, Mobile, and Password are required.');
      return;
    }
    if (formTargetSize === 3 && (!m3Name.trim() || !m3Mobile.trim() || !m3Pass.trim())) {
      setCreateError('Member 3 Full Name, Mobile, and Password are required for a 3-member team.');
      return;
    }

    setCreateLoading(true);
    try {
      const payload = {
        name: teamNameInput.trim(),
        targetSize: Number(formTargetSize),
        leader: {
          fullName: leaderName.trim(),
          email: leaderEmail.trim() || `${leaderMobile.replace(/[^\d]/g, '')}@student.bob.pk`,
          mobile: leaderMobile.trim(),
          password: leaderPass.trim(),
        },
        member2: {
          fullName: m2Name.trim(),
          email: m2Email.trim() || `${m2Mobile.replace(/[^\d]/g, '')}@student.bob.pk`,
          mobile: m2Mobile.trim(),
          password: m2Pass.trim(),
        },
        member3: formTargetSize === 3 ? {
          fullName: m3Name.trim(),
          email: m3Email.trim() || `${m3Mobile.replace(/[^\d]/g, '')}@student.bob.pk`,
          mobile: m3Mobile.trim(),
          password: m3Pass.trim(),
        } : null,
      };

      const res = await apiAdminCreateTeam(payload);
      if (res && res.error) {
        setCreateError(res.error);
        setCreateLoading(false);
        return;
      }

      setCreateSuccess(`Team "${teamNameInput}" successfully created with ${formTargetSize} enrolled members!`);
      setTimeout(() => {
        setIsAddModalOpen(false);
        setCreateSuccess('');
        setTeamNameInput('');
        setLeaderName('');
        setLeaderEmail('');
        setLeaderMobile('');
        setLeaderPass('');
        setM2Name('');
        setM2Email('');
        setM2Mobile('');
        setM2Pass('');
        setM3Name('');
        setM3Email('');
        setM3Mobile('');
        setM3Pass('');
        fetchTeams();
      }, 1200);
    } catch (err) {
      setCreateError(err.message || 'Error creating team.');
    } finally {
      setCreateLoading(false);
    }
  };

  const exportTeamsCSV = () => {
    if (!teams.length) {
      alert('No teams to export.');
      return;
    }
    const headers = ['Team ID', 'Team Name', 'Invite Code', 'Status', 'Members Count', 'Leader Name', 'Leader Email', 'Leader Mobile', 'Member 2 Name', 'Member 2 Email', 'Member 2 Mobile', 'Member 3 Name', 'Member 3 Email', 'Member 3 Mobile'];
    const rows = teams.map(t => {
      const m = t.members || [];
      return [
        t.id || '',
        `"${(t.name || '').replace(/"/g, '""')}"`,
        t.inviteCode || '',
        t.status || 'forming',
        `${m.length}/${t.targetSize || 3}`,
        `"${(m[0]?.fullName || t.leaderName || '').replace(/"/g, '""')}"`,
        m[0]?.email || '',
        m[0]?.mobile || t.leaderMobile || '',
        `"${(m[1]?.fullName || '').replace(/"/g, '""')}"`,
        m[1]?.email || '',
        m[1]?.mobile || '',
        `"${(m[2]?.fullName || '').replace(/"/g, '""')}"`,
        m[2]?.email || '',
        m[2]?.mobile || ''
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `teams_roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTeams = teams.filter(t => {
    const q = search.toLowerCase();
    const nameMatch = (t.name || '').toLowerCase().includes(q) || (t.inviteCode || '').toLowerCase().includes(q);
    const memberMatch = (t.members || []).some(m => (m.fullName || '').toLowerCase().includes(q) || (m.mobile || '').includes(q) || (m.email || '').toLowerCase().includes(q));
    const matchesSearch = !q || nameMatch || memberMatch;
    const matchesStatus = statusFilter === 'All' || (statusFilter === 'Confirmed' ? t.status === 'confirmed' : t.status !== 'confirmed');
    return matchesSearch && matchesStatus;
  });

  const confirmedCount = teams.filter(t => t.status === 'confirmed').length;
  const formingCount = teams.length - confirmedCount;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Teams Formation & Management Hub</span>
            <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              2–3 Members per Team
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Add new teams directly, remove teams, monitor leader & member credentials, and export rosters.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Admin Add Team Button (Requested by User) */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Team</span>
          </button>

          <button
            onClick={fetchTeams}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer text-slate-700 dark:text-slate-300"
            title="Refresh Teams"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={exportTeamsCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Teams</span>
          <div className="text-3xl font-heading font-black text-blue-600 mt-1">{teams.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Active groups in Battle of Brains</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Confirmed & Locked</span>
          <div className="text-3xl font-heading font-black text-emerald-600 mt-1">{confirmedCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Ready for competition rounds</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Forming (Pending Members)</span>
          <div className="text-3xl font-heading font-black text-amber-600 mt-1">{formingCount}</div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">Waiting for members to join</span>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search team name, invite code, leader or teammate name/email/phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium focus:outline-none"
          >
            <option value="All">All Statuses ({teams.length})</option>
            <option value="Confirmed">Confirmed Only ({confirmedCount})</option>
            <option value="Forming">Forming Only ({formingCount})</option>
          </select>
        </div>
      </div>

      {/* Teams Grid */}
      {filteredTeams.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <h4 className="font-heading font-bold text-slate-800 dark:text-slate-200">No Teams Found</h4>
          <p className="text-xs text-slate-500">No teams match your current search or filter criteria.</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-all cursor-pointer"
          >
            + Create First Team
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTeams.map((team) => {
            const members = team.members || [];
            const isConfirmed = team.status === 'confirmed';
            const count = members.length;
            const target = team.targetSize || 3;

            return (
              <div
                key={team.id || team.name}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 shadow-sm space-y-4 hover:border-blue-500/50 transition-all flex flex-col justify-between"
              >
                {/* Team Top Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                        <h4 className="font-heading font-black text-base text-slate-900 dark:text-white">
                          {team.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-mono text-slate-500">Code:</span>
                        <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-600 font-mono font-bold text-[11px] border border-blue-200 dark:border-blue-800">
                          {team.inviteCode}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopy(team.inviteCode)}
                          className="text-slate-400 hover:text-blue-600 p-0.5"
                          title="Copy Code"
                        >
                          {copiedCode === team.inviteCode ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider border ${
                        isConfirmed 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300' 
                          : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300'
                      }`}>
                        {isConfirmed ? '✓ Confirmed' : '● Forming'}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-400">
                        {count} / {target} Members
                      </span>
                    </div>
                  </div>

                  {/* Members List */}
                  <div className="space-y-2 pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Enrolled Team Roster:
                    </span>

                    {/* Member 1 (Leader) */}
                    {members[0] && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-600 text-sm">👑</span>
                          <div>
                            <strong className="block text-slate-900 dark:text-white font-bold leading-tight">
                              {members[0].fullName} (Leader)
                            </strong>
                            <span className="text-[10px] font-mono text-slate-500 block">ID: {members[0].studentId || 'Leader'}</span>
                            {members[0].email && (
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span>{members[0].email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold shrink-0">
                          📞 {members[0].mobile || 'N/A'}
                        </span>
                      </div>
                    )}

                    {/* Member 2 */}
                    {members[1] ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 text-sm">👤</span>
                          <div>
                            <strong className="block text-slate-900 dark:text-white font-bold leading-tight">
                              {members[1].fullName}
                            </strong>
                            <span className="text-[10px] font-mono text-slate-500 block">ID: {members[1].studentId || 'Member'}</span>
                            {members[1].email && (
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span>{members[1].email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold shrink-0">
                          📞 {members[1].mobile || 'N/A'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-[11px] text-slate-400">
                        Slot 2: Waiting for teammate to register...
                      </div>
                    )}

                    {/* Member 3 */}
                    {members[2] ? (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 text-sm">👤</span>
                          <div>
                            <strong className="block text-slate-900 dark:text-white font-bold leading-tight">
                              {members[2].fullName}
                            </strong>
                            <span className="text-[10px] font-mono text-slate-500 block">ID: {members[2].studentId || 'Member'}</span>
                            {members[2].email && (
                              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1 mt-0.5">
                                <Mail className="w-3 h-3 shrink-0" />
                                <span>{members[2].email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold shrink-0">
                          📞 {members[2].mobile || 'N/A'}
                        </span>
                      </div>
                    ) : (
                      <div className="p-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-[11px] text-slate-400">
                        Slot 3: Optional (Open Slot)
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  {!isConfirmed ? (
                    <button
                      type="button"
                      disabled={count < 2}
                      onClick={() => handleAdminFinalize(team)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-heading font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Lock & Confirm Team</span>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Registration Locked
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDeleteTeam(team.id, team.name)}
                    className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-900/50"
                    title="Delete Team"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          ADMIN CREATE TEAM MODAL (REQUESTED BY USER)
          ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-500/20">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-black text-slate-900 dark:text-white">
                    Create & Register New Team
                  </h3>
                  <p className="text-xs text-slate-500">
                    Administrator direct team formation with individual student credentials.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            {createSuccess && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{createSuccess}</span>
              </div>
            )}

            <form onSubmit={handleCreateTeamSubmit} className="space-y-6">
              {/* Team Basics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Team Name *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Code Warriors"
                    value={teamNameInput}
                    onChange={(e) => setTeamNameInput(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Team Size
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTargetSize(2)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formTargetSize === 2
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      2 Members
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormTargetSize(3)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                        formTargetSize === 3
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      3 Members
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. Team Leader Section */}
              <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Crown className="w-3.5 h-3.5" />
                  <span>1. Team Leader Information</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Daniyal Khan"
                      value={leaderName}
                      onChange={(e) => setLeaderName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. leader@comsats.edu.pk"
                      value={leaderEmail}
                      onChange={(e) => setLeaderEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mobile Number * (Unique)</label>
                    <input
                      type="tel"
                      placeholder="e.g. 0300 1234567"
                      value={leaderMobile}
                      onChange={(e) => setLeaderMobile(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Account Password *</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={leaderPass}
                      onChange={(e) => setLeaderPass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-amber-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 2. Member 2 Section */}
              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" />
                  <span>2. Team Member 2 Information</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Hamza Tariq"
                      value={m2Name}
                      onChange={(e) => setM2Name(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Email Address *</label>
                    <input
                      type="email"
                      placeholder="e.g. hamza@comsats.edu.pk"
                      value={m2Email}
                      onChange={(e) => setM2Email(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mobile Number * (Unique)</label>
                    <input
                      type="tel"
                      placeholder="e.g. 0300 7654321"
                      value={m2Mobile}
                      onChange={(e) => setM2Mobile(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Account Password *</label>
                    <input
                      type="password"
                      placeholder="Min 6 characters"
                      value={m2Pass}
                      onChange={(e) => setM2Pass(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 3. Member 3 Section (If 3 members selected) */}
              {formTargetSize === 3 && (
                <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20 space-y-3 animate-fadeIn">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5 uppercase tracking-wider">
                    <Users className="w-3.5 h-3.5" />
                    <span>3. Team Member 3 Information</span>
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Full Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Bilal Ahmed"
                        value={m3Name}
                        onChange={(e) => setM3Name(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                        required={formTargetSize === 3}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Email Address *</label>
                      <input
                        type="email"
                        placeholder="e.g. bilal@comsats.edu.pk"
                        value={m3Email}
                        onChange={(e) => setM3Email(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Mobile Number * (Unique)</label>
                      <input
                        type="tel"
                        placeholder="e.g. 0301 9876543"
                        value={m3Mobile}
                        onChange={(e) => setM3Mobile(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-purple-500"
                        required={formTargetSize === 3}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">Account Password *</label>
                      <input
                        type="password"
                        placeholder="Min 6 characters"
                        value={m3Pass}
                        onChange={(e) => setM3Pass(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                        required={formTargetSize === 3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createLoading}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all cursor-pointer flex items-center gap-2"
                >
                  {createLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Creating Team...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Register & Confirm Team</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
