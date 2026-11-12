import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Pencil, 
  CheckCircle2, 
  X, 
  Calendar,
  Send,
  Mail
} from 'lucide-react';
import { 
  apiGetAnnouncements, 
  apiCreateAnnouncement, 
  apiDeleteAnnouncement 
} from '../../utils/api';

export default function AnnouncementsManager({ isDark }) {
  const [announcements, setAnnouncements] = useState([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const list = await apiGetAnnouncements();
      if (Array.isArray(list)) setAnnouncements(list);
    } catch {}
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    try {
      const res = await apiCreateAnnouncement({
        title: newTitle.trim(),
        content: newContent.trim(),
        category: newCategory,
        isPublished: true,
      });

      if (res.success) {
        const emailCount = res.emailsDispatched || res.announcement?.emailDispatchedCount || 'all registered';
        setStatusMessage(`✓ Announcement published & automatically dispatched to ${emailCount} student email addresses!`);
        setNewTitle('');
        setNewContent('');
        setIsCreating(false);
        fetchAnnouncements();
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (err) {
      console.error('Error creating announcement:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await apiDeleteAnnouncement(id);
      fetchAnnouncements();
    } catch {}
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className={`text-xl font-heading font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Tournament Announcements & Bulletins
          </h3>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} mt-0.5`}>
            Broadcast official tournament updates, schedule changes, and alerts to all contestants.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white text-xs font-heading font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>New Announcement</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Create Announcement Form */}
      {isCreating && (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <h4 className="font-heading font-bold text-sm text-white">Create Official Bulletin</h4>
            <button onClick={() => setIsCreating(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 mb-1">Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. Round 1 Results Approved & Published"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white"
                >
                  <option value="General">General</option>
                  <option value="Schedule">Schedule</option>
                  <option value="Regulations">Regulations</option>
                  <option value="Results">Results & Standing</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">Content Body</label>
              <textarea
                rows={4}
                placeholder="Type official details broadcasted to students..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 rounded-xl bg-[#2563eb] text-white text-xs font-heading font-bold hover:bg-blue-600 flex items-center gap-1.5 shadow-lg"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Publish Bulletin</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs border border-white/5 rounded-xl">
            No tournament announcements created yet.
          </div>
        ) : (
          announcements.map((a) => (
            <div
              key={a.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-heading font-bold text-sm text-white">{a.title}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {a.category}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">{a.content}</p>
                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500">
                    Published: {new Date(a.createdAt || Date.now()).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    <Mail className="w-3 h-3 text-emerald-400" />
                    <span>Dispatched to Student Emails</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  onClick={() => handleDelete(a.id)}
                  className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors cursor-pointer"
                  title="Delete Announcement"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
