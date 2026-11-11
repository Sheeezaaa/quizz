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
  UserCheck
} from 'lucide-react';
import { apiGetAllTeams, apiFinalizeTeam } from '../../utils/api';
import { getStoredTeams, localFinalizeTeam } from '../../utils/storage';

export default function TeamsManager({ isDark }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [copiedCode, setCopiedCode] = useState(null);

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

  const handleAdminFinalize = async (teamName) => {
    if (!window.confirm(`Force confirm and lock registration for team "${teamName}"?`)) return;
    try {
      await apiFinalizeTeam(teamName);
    } catch {}
    localFinalizeTeam(teamName);
    fetchTeams();
  };

  const handleDeleteTeam = (teamId, teamName) => {
    if (!window.confirm(`Are you sure you want to delete team "${teamName}"? Members will be unlinked.`)) return;
    try {
      const stored = getStoredTeams();
      const updated = stored.filter(t => t.id !== teamId && t.name !== teamName);
      localStorage.setItem('bob_official_teams_v1', JSON.stringify(updated));
      setTeams(updated);
    } catch (e) {
      alert(e.message);
    }
  };

  const exportTeamsCSV = () => {
    if (!teams.length) {
      alert('No teams to export.');
      return;
    }
    const headers = ['Team ID', 'Team Name', 'Invite Code', 'Status', 'Members Count', 'Leader Name', 'Leader Mobile', 'Member 2 Name', 'Member 2 Mobile', 'Member 3 Name', 'Member 3 Mobile'];
    const rows = teams.map(t => {
      const m = t.members || [];
      return [
        t.id || '',
        `"${(t.name || '').replace(/"/g, '""')}"`,
        t.inviteCode || '',
        t.status || 'forming',
        `${m.length}/${t.targetSize || 3}`,
        `"${(m[0]?.fullName || t.leaderName || '').replace(/"/g, '""')}"`,
        m[0]?.mobile || t.leaderMobile || '',
        `"${(m[1]?.fullName || '').replace(/"/g, '""')}"`,
        m[1]?.mobile || '',
        `"${(m[2]?.fullName || '').replace(/"/g, '""')}"`,
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
    const memberMatch = (t.members || []).some(m => (m.fullName || '').toLowerCase().includes(q) || (m.mobile || '').includes(q));
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
            <span>Teams Formation & Roster Hub</span>
            <span className="text-xs font-mono font-bold bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded-full border border-blue-500/30">
              2–3 Members per Team
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Monitor registered teams, leader credentials, invitation links, and joined teammates.
          </p>
        </div>

        <div className="flex items-center gap-2">
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
            <span>Export Teams CSV</span>
          </button>
        </div>
      </div>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Total Teams</span>
          <div className="text-3xl font-heading font-black text-blue-600 mt-1">{teams.length}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered in Battle of Brains</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Confirmed & Locked</span>
          <div className="text-3xl font-heading font-black text-emerald-600 mt-1">{confirmedCount}</div>
          <span className="text-[11px] text-emerald-600 font-medium mt-1 block">Ready for tournament</span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Forming (Pending Members)</span>
          <div className="text-3xl font-heading font-black text-amber-600 mt-1">{formingCount}</div>
          <span className="text-[11px] text-amber-600 font-medium mt-1 block">Waiting for 2nd / 3rd member</span>
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
            placeholder="Search team name, invite code, leader or teammate name/phone..."
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
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
          <Users className="w-10 h-10 text-slate-400 mx-auto opacity-50" />
          <h4 className="font-heading font-bold text-slate-800 dark:text-slate-200">No Teams Found</h4>
          <p className="text-xs text-slate-500">No teams match your current search or filter criteria.</p>
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
                            <span className="text-[11px] font-mono text-slate-500">ID: {members[0].studentId || 'Leader'}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold">
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
                            <span className="text-[11px] font-mono text-slate-500">ID: {members[1].studentId || 'Member'}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold">
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
                            <span className="text-[11px] font-mono text-slate-500">ID: {members[2].studentId || 'Member'}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 font-bold">
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
                      onClick={() => handleAdminFinalize(team.name)}
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
                    className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-all"
                    title="Delete Team"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
