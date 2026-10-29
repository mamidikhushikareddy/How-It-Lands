/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Sparkles, PlusCircle, Bookmark, History, FileText, 
  ArrowRight, BookOpen, DollarSign, MessageCircle, AlertCircle, TrendingUp, Heart
} from 'lucide-react';
import { User, UserProfile, Analysis } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface DashboardProps {
  user: User;
  profile: UserProfile;
  analyses: Analysis[];
  onNavigate: (route: string) => void;
  onSelectAnalysis: (analysis: Analysis) => void;
}

export default function Dashboard({ 
  user, 
  profile, 
  analyses, 
  onNavigate, 
  onSelectAnalysis
}: DashboardProps) {
  
  // Calculate stats
  const totalAnalyses = analyses.length;
  const savedAnalyses = analyses.filter(a => a.saved).length;
  const freeLimit = 3;
  const creditsUsed = totalAnalyses;

  // Tip of the day!
  const tips = [
    { title: "Avoid the Double Text", desc: "If they haven't replied in 24 hours, do not send a follow-up explaining your first text. It indicates high anxiety. Use our 'Follow-Up Mode' to bump with extreme confidence on Day 3." },
    { title: "Apologize Cleanly", desc: "A great apology takes 100% accountability, explains how you've fixed the bottleneck, and never details excuses about your sleep, alarm, or workload." },
    { title: "Say No in 2 Sentences", desc: "Stating 'I don't have the bandwidth right now' is a complete boundary. Stating 'I can't because my dog is sick' invites them to ask again next week." }
  ];

  const currentTip = tips[totalAnalyses % tips.length];

  return (
    <div className="space-y-8 max-w-6xl mx-auto p-2 animate-fade-in text-slate-900 dark:text-slate-100">
      {/* Welcome header & Premium banner */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
        <div className="md:col-span-8 bg-white dark:bg-[#14171B] border border-black/10 dark:border-white/10 p-6 md:p-8 rounded-2xl shadow-sm flex flex-col justify-center space-y-4 hover:border-black/20 dark:hover:border-slate-300 dark:hover:border-white/20 transition duration-200">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white font-mono text-[9px] tracking-widest uppercase font-medium w-fit">
            <Sparkles className="w-3 h-3 text-[#00A6B8] dark:text-[#00D2E0]" />
            <span>Active Strategy Profile</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-serif font-light text-gray-900 dark:text-white leading-tight">
            Hello, <span className="italic font-normal">{user.name}</span>
          </h1>
          <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed max-w-xl font-sans font-light">
            Your communication strategist is calibrated. Current style focus is <span className="font-semibold text-gray-900 dark:text-white">{profile.communication_style || 'Warm'}</span>, target tone set to <span className="text-[#00A6B8] dark:text-[#00D2E0] font-medium">{profile.preferred_tone || 'Kind but direct'}</span>.
          </p>
        </div>

        <Card className="md:col-span-4 rounded-[24px] border border-slate-200 dark:border-white/10 bg-white dark:bg-[#151B28] shadow-sm p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-300 dark:hover:border-white/20 transition duration-300">
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-mono uppercase text-[9px] tracking-wider">Workspace Health</span>
              <span className="px-2.5 py-1 rounded-full font-mono font-semibold text-[8px] uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Sovereign Activated
              </span>
            </div>
            
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Sovereign Communication</h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 font-sans font-light leading-normal">
                Enjoy unlimited tactical guidance, advanced behavioral mapping, and unlimited analyses. No limits apply.
              </p>
            </div>
          </div>
          <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
            <span>Total Diagnoses:</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold">{totalAnalyses}</span>
          </div>
        </Card>
      </div>

      {/* Main interactive call-to-actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('/app/analyze')}
          className="bg-white dark:bg-[#141821] p-6 rounded-[24px] border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.03] transition pointer-events-none"></div>
          <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-xl flex items-center justify-center shadow-inner transition group-hover:bg-white/10">
            <PlusCircle className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div>
            <h3 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              Start Message Analysis
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-[#00E5FF]" />
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-sans font-light">
              Paste a draft text, email, or DM to test how it lands before sending it.
            </p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('/app/templates')}
          className="bg-white dark:bg-[#141821] p-6 rounded-[24px] border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.03] transition pointer-events-none"></div>
          <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-xl flex items-center justify-center shadow-inner transition group-hover:bg-white/10">
            <Bookmark className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              Templates Library
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-emerald-400" />
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-sans font-light">
              Browse expert-crafted starters for apologies, invoices, rejection, or dating space.
            </p>
          </div>
        </div>

        <div 
          onClick={() => onNavigate('/app/playbooks')}
          className="bg-white dark:bg-[#141821] p-6 rounded-[24px] border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between h-48 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-white/[0.01] rounded-full blur-2xl group-hover:bg-white/[0.03] transition pointer-events-none"></div>
          <div className="w-10 h-10 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 rounded-xl flex items-center justify-center shadow-inner transition group-hover:bg-white/10">
            <BookOpen className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-sm flex items-center gap-1.5">
              Strategic Playbooks
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition text-purple-400" />
            </h3>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed font-sans font-light">
              Step-by-step psychological strategies for deep client or relational conflicts.
            </p>
          </div>
        </div>
      </div>

      {/* Guided Scenario Mode shortcuts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 font-medium">GUIDED SCENARIO FLOWS</span>
          <button onClick={() => onNavigate('/app/templates')} className="text-[11px] text-sky-700 hover:text-sky-800 dark:text-cyan-400 dark:hover:text-cyan-300 hover:underline font-medium flex items-center gap-1 bg-transparent cursor-pointer">
            <span>See All Scenarios</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { id: 'breakup', title: 'Breakup & Closure', icon: Heart, color: 'text-rose-400 bg-rose-500/5 border-rose-500/10' },
            { id: 'apology', title: 'Sincere Apology', icon: MessageCircle, color: 'text-cyan-400 bg-cyan-500/5 border-cyan-500/10' },
            { id: 'boundary', title: 'Say No / Boundary', icon: AlertCircle, color: 'text-amber-400 bg-amber-500/5 border-amber-500/10' },
            { id: 'client-money', title: 'Client Payments', icon: DollarSign, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' }
          ].map((scen) => (
            <button
              key={scen.id}
              onClick={() => onNavigate(`/app/scenarios/${scen.id}`)}
              className="bg-white dark:bg-[#141821] p-5 rounded-[20px] border border-slate-200 dark:border-white/10 shadow-sm hover:border-slate-300 dark:hover:border-slate-300 dark:hover:border-white/20 hover:-translate-y-0.5 transition duration-200 text-left flex flex-col justify-between h-28 cursor-pointer shadow-sm"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${scen.color} border`}>
                <scen.icon className="w-4 h-4" />
              </div>
              <span className="text-xs font-serif font-semibold text-slate-900 dark:text-slate-100 leading-tight">{scen.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Recent history + Tip of the Day */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent analyses */}
        <div className="lg:col-span-8 bg-white dark:bg-[#141821] border border-slate-200 dark:border-white/10 shadow-sm p-6 rounded-[24px] space-y-4 hover:border-slate-300 dark:hover:border-slate-300 dark:hover:border-white/20 transition duration-300">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-3">
            <span className="text-[10px] uppercase font-mono text-slate-800 dark:text-slate-200 tracking-wider font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Recent Message Diagnoses ({totalAnalyses})
            </span>
            <button onClick={() => onNavigate('/app/vault')} className="text-xs text-sky-700 hover:text-sky-800 dark:text-slate-400 dark:hover:text-white font-medium bg-transparent cursor-pointer">
              View Personal Vault
            </button>
          </div>

          {analyses.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
              <FileText className="w-10 h-10 mx-auto opacity-30" />
              <p className="text-xs font-sans font-light">You haven't completed any analyses yet. Paste your first draft!</p>
              <Button 
                onClick={() => onNavigate('/app/analyze')}
                variant="primary"
                size="sm"
                className="mt-2 rounded-xl"
              >
                Analyze a Draft Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {analyses.slice(0, 4).map((item) => (
                <div 
                  key={item.id}
                  onClick={() => onSelectAnalysis(item)}
                  className="p-4 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition cursor-pointer flex items-center justify-between gap-4 shadow-xs"
                >
                  <div className="space-y-1.5 overflow-hidden flex-1">
                    <p className="text-xs font-serif font-medium text-slate-900 dark:text-slate-100 truncate">{item.title}</p>
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 font-mono uppercase">
                      <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded border border-slate-200 dark:border-white/10 font-semibold">{item.scenario}</span>
                      <span>•</span>
                      <span>{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <span className="text-[8px] text-slate-500 dark:text-slate-400 block font-mono">STATUS</span>
                      <span className={`text-[10px] uppercase font-mono font-semibold ${
                        item.output_json.summary.landing_status === 'well' ? 'text-emerald-600 dark:text-emerald-400' : 
                        item.output_json.summary.landing_status === 'risky' || item.output_json.summary.landing_status === 'neutral' ? 'text-amber-600 dark:text-amber-400' : 
                        'text-rose-600 dark:text-rose-400'
                      }`}>
                        {item.output_json.summary.landing_status}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Insights & Tip of the day */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white dark:bg-[#141821] border border-slate-200 dark:border-white/10 shadow-sm p-6 rounded-[24px] space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition duration-300 flex-1 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 font-semibold block">STRATEGIC TIP OF THE DAY</span>
            <div className="space-y-2">
              <h4 className="font-serif font-medium text-slate-900 dark:text-slate-100 text-sm">{currentTip.title}</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-sans font-light">
                {currentTip.desc}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#141821] border border-slate-200 dark:border-white/10 shadow-sm p-6 rounded-[24px] space-y-4 hover:border-slate-300 dark:hover:border-white/20 transition duration-300 flex-1 flex flex-col justify-center">
            <span className="text-[9px] uppercase font-mono tracking-widest text-slate-500 dark:text-slate-400 font-semibold block flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#00A6B8] dark:text-[#00E5FF]" />
              Communication Profile
            </span>
            <div className="space-y-3.5 text-xs font-sans font-light">
              <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                <span className="text-slate-600 dark:text-slate-400">Communication Style</span>
                <span className="text-sky-700 dark:text-[#00E5FF] font-semibold font-mono uppercase text-[10px]">{profile.communication_style || 'Warm'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 dark:border-white/5 pb-2.5">
                <span className="text-slate-600 dark:text-slate-400">Overexplaining Flag</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono text-[10px] uppercase">ACTIVE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-400">Saved in Vault</span>
                <span className="text-slate-900 dark:text-slate-100 font-medium">{savedAnalyses} items</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
