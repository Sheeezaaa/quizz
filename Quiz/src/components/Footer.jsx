import React from 'react';
import { 
  Zap, 
  ArrowUp, 
  Mail, 
  Phone, 
  MapPin, 
  Trophy, 
  UserCheck,
  ShieldCheck,
  IdCard,
  Code2,
  ExternalLink
} from 'lucide-react';
import { COMPETITION_DETAILS, COMPETITION_SUBJECTS } from '../data/competitionData';

export default function Footer({ onOpenAdmin, onOpenStudentPortal }) {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Environment variables for developer credits (with authoritative fallbacks)
  const sheezaLinkedIn = (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_DEVELOPER_SHEEZA_LINKEDIN_URL) || 
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEVELOPER_SHEEZA_LINKEDIN_URL) || 
    'https://www.linkedin.com/in/sheeza-rasheed-94490b405';

  const yameenaLinkedIn = (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_DEVELOPER_YAMEENA_LINKEDIN_URL) || 
    (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_DEVELOPER_YAMEENA_LINKEDIN_URL) || 
    'https://www.linkedin.com/in/yameena-murtaza';

  return (
    <footer className="bg-gradient-to-b from-sky-100 via-sky-50 to-white border-t-2 border-sky-300 pt-16 pb-12 relative overflow-hidden text-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Main Footer Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-sky-200">
          
          {/* Column 1: Brand & University Identity */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                <Zap className="w-5 h-5 fill-current" />
              </div>
              <div className="flex items-center">
                <span className="font-heading font-black text-xl tracking-tight text-blue-700">
                  BATTLE
                </span>
                <span className="font-heading font-black text-xl tracking-tight text-slate-900 ml-1.5">
                  OF BRAINS
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed max-w-sm font-medium">
              The flagship individual university computing quiz championship celebrating student knowledge, analytical speed, and algorithmic mastery. Every student competes solo.
            </p>

            <div className="pt-2 text-xs text-slate-800 space-y-1.5 bg-white/90 p-3.5 rounded-xl border border-sky-200 shadow-sm">
              <div><strong className="text-blue-900 font-bold">Host:</strong> <span className="text-slate-700 font-medium">{COMPETITION_DETAILS.organizer}</span></div>
              <div><strong className="text-blue-900 font-bold">University:</strong> <span className="text-slate-700 font-medium">{COMPETITION_DETAILS.university}</span></div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="font-heading font-black text-xs text-blue-900 uppercase tracking-wider">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 font-medium">
              <li><a href="#hero" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all">Home Page</a></li>
              <li><a href="#about" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all">About Championship</a></li>
              <li><a href="#subjects" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all">7 Subjects Scope</a></li>
              <li><a href="#rounds" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all">4 Competition Rounds</a></li>
              <li><a href="#rules" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all">Rules & Regulations</a></li>
              <li><a href="#register" className="hover:text-blue-600 hover:translate-x-1 inline-block transition-all">Individual Registration</a></li>
            </ul>
          </div>

          {/* Column 3: 7 Competition Subjects */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-heading font-black text-xs text-blue-900 uppercase tracking-wider">
              Competition Subjects
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
              {COMPETITION_SUBJECTS.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0"></span>
                  <a href="#subjects" className="hover:text-blue-600 transition-colors truncate">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Secretariat Desk & Portals */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="font-heading font-black text-xs text-blue-900 uppercase tracking-wider">
              Secretariat & Portals
            </h4>
            <div className="space-y-2 text-xs text-slate-700 font-medium">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">Main Auditorium, Faculty of Computing, COMSATS University Islamabad</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600 shrink-0" />
                <a href="mailto:quiz.secretariat@comsats.edu.pk" className="truncate hover:text-blue-800 text-blue-700 font-bold underline underline-offset-2">
                  quiz.secretariat@comsats.edu.pk
                </a>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-2.5">
              {onOpenStudentPortal && (
                <button
                  onClick={onOpenStudentPortal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-heading font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <IdCard className="w-3.5 h-3.5" />
                  <span>Student Portal</span>
                </button>
              )}
            </div>
          </div>

        </div>

        {/* DEVELOPER CREDITS ROW (Official Mandatory Attribution) */}
        <div className="py-8 border-b border-sky-200">
          <div className="flex items-center gap-2 mb-4">
            <Code2 className="w-5 h-5 text-blue-600" />
            <h4 className="text-xs font-heading font-black text-blue-950 uppercase tracking-wider">
              Engineered & Developed By
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Developer 1: Sheeza Rasheed */}
            <div className="developer-card p-5 rounded-2xl bg-white border-2 border-sky-300 hover:border-blue-500 transition-all shadow-lg shadow-sky-900/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-heading font-black text-sm shadow-md shrink-0">
                      SR
                    </div>
                    <div>
                      <h5 className="font-heading font-black text-base text-slate-900 tracking-tight leading-tight">
                        Sheeza Rasheed
                      </h5>
                      <span className="text-[11px] text-slate-600 font-semibold">
                        Full Stack Software Engineer
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 shrink-0">
                    Developer
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-sky-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Registration ID:</span>
                    <strong className="dev-reg font-mono font-bold text-sky-900 bg-sky-100 px-2.5 py-0.5 rounded-md border border-sky-300 text-[11px]">
                      SP24-BSE-043
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Academic Role:</span>
                    <span className="text-slate-800 font-semibold">BSE Department, COMSATS</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sky-100">
                {sheezaLinkedIn ? (
                  <a
                    href={sheezaLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0077b5] hover:bg-[#005e93] text-white text-xs font-heading font-bold shadow-md shadow-[#0077b5]/20 transition-all w-fit cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.65 1.65 0 0 0-1.66 1.66 1.66 1.66 0 0 0 1.66 1.66 1.66 1.66 0 0 0 1.66-1.66 1.66 1.66 0 0 0-1.66-1.66Z" />
                    </svg>
                    <span>Connect on LinkedIn</span>
                    <ExternalLink className="w-3 h-3 text-white/80" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">
                    LINKEDIN (URL: NEXT_PUBLIC_DEVELOPER_SHEEZA_LINKEDIN_URL)
                  </span>
                )}
              </div>
            </div>

            {/* Developer 2: Yameena Murtaza */}
            <div className="developer-card p-5 rounded-2xl bg-white border-2 border-sky-300 hover:border-blue-500 transition-all shadow-lg shadow-sky-900/5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-600 to-indigo-600 flex items-center justify-center text-white font-heading font-black text-sm shadow-md shrink-0">
                      YM
                    </div>
                    <div>
                      <h5 className="font-heading font-black text-base text-slate-900 tracking-tight leading-tight">
                        Yameena Murtaza
                      </h5>
                      <span className="text-[11px] text-slate-600 font-semibold">
                        Full Stack Software Engineer
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-sky-100 text-sky-800 border border-sky-300 shrink-0">
                    Developer
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-sky-100 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Registration ID:</span>
                    <strong className="dev-reg font-mono font-bold text-sky-900 bg-sky-100 px-2.5 py-0.5 rounded-md border border-sky-300 text-[11px]">
                      SP24-BSE-029
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Academic Role:</span>
                    <span className="text-slate-800 font-semibold">BSE Department, COMSATS</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-sky-100">
                {yameenaLinkedIn ? (
                  <a
                    href={yameenaLinkedIn}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0077b5] hover:bg-[#005e93] text-white text-xs font-heading font-bold shadow-md shadow-[#0077b5]/20 transition-all w-fit cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.25V10.9H6.46M7.86 6.64a1.65 1.65 0 0 0-1.66 1.66 1.66 1.66 0 0 0 1.66 1.66 1.66 1.66 0 0 0 1.66-1.66 1.66 1.66 0 0 0-1.66-1.66Z" />
                    </svg>
                    <span>Connect on LinkedIn</span>
                    <ExternalLink className="w-3 h-3 text-white/80" />
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-500 italic">
                    LINKEDIN (URL: NEXT_PUBLIC_DEVELOPER_YAMEENA_LINKEDIN_URL)
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600 font-medium">
          <div>
            © 2026 Battle of Brains – Individual Computing Quiz Championship. {COMPETITION_DETAILS.university}. All Rights Reserved.
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={scrollToTop}
              className="w-9 h-9 rounded-xl bg-white border-2 border-sky-300 hover:border-blue-500 text-slate-700 hover:text-blue-600 flex items-center justify-center transition-all cursor-pointer shadow-sm hover:shadow"
              aria-label="Scroll back to top"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </footer>
  );
}
