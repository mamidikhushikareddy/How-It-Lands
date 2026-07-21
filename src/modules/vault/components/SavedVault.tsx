/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Bookmark, Search, Trash2, Calendar, ChevronRight } from 'lucide-react';
import { Analysis } from '../../../types';
import { Card } from '../../../components/ui/Card';

interface SavedVaultProps {
  analyses: Analysis[];
  onSelectAnalysis: (analysis: Analysis) => void;
  onDeleteAnalysis: (id: string) => void;
  onSaveToggle: (id: string, saved: boolean) => void;
}

export default function SavedVault({
  analyses,
  onSelectAnalysis,
  onDeleteAnalysis,
  onSaveToggle
}: SavedVaultProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'saved'>('all');

  // Filter lists
  const filteredAnalyses = analyses.filter(a => {
    const title = a.title || '';
    const orig = a.original_message || '';
    const scen = a.scenario || '';
    const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          orig.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          scen.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'saved') {
      return matchesSearch && !!a.saved;
    }
    return matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto p-2 animate-fade-in text-[#FAF8F5]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/5 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] uppercase font-mono tracking-widest text-[#a0a0a0] font-medium">SAVED DIAGNOSTIC ARCHIVE</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-serif font-light text-white">Your Personal Vault</h1>
          <p className="text-xs text-[#a0a0a0] font-sans font-light">Access saved analyses, specific strategic rewrites, and historical critiques.</p>
        </div>

        {/* Tab filters */}
        <div className="flex gap-1 bg-[#141414] border border-[#262626] p-1 rounded-xl">
          <button
            onClick={() => {
              setActiveTab('saved');
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium tracking-wide transition cursor-pointer ${
              activeTab === 'saved' 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'text-[#888] hover:text-white bg-transparent'
            }`}
          >
            SAVED VAULT
          </button>
          <button
            onClick={() => {
              setActiveTab('all');
              setSearchTerm('');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-mono font-medium tracking-wide transition cursor-pointer ${
              activeTab === 'all' 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'text-[#888] hover:text-white bg-transparent'
            }`}
          >
            ALL HISTORY
          </button>
        </div>
      </div>

      {/* Search Input bar */}
      <div className="relative">
        <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-[#888]">
          <Search className="w-4 h-4" />
        </span>
        <input
          type="text"
          placeholder="Search by title, original message contents, or scenario..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-11 py-3 bg-[#141414] border border-[#262626] focus:border-white/20 rounded-xl text-xs text-white placeholder-[#888] focus:outline-none transition font-sans font-light"
        />
      </div>

      {filteredAnalyses.length === 0 ? (
        <Card className="py-16 text-center space-y-4 rounded-[24px] border border-[#262626] bg-[#141414]">
          <Bookmark className="w-10 h-10 text-[#888] opacity-30 mx-auto" />
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-white font-serif font-light text-sm">
              {activeTab === 'saved' ? "Your Vault is empty" : "No history found"}
            </h3>
            <p className="text-xs text-[#a0a0a0] leading-relaxed font-sans font-light">
              {activeTab === 'saved' 
                ? "Whenever you analyze a message, click the Bookmark icon in the report to save its diagnostics and strategic rewrites here for future templates." 
                : "Your completed analyses will appear here. Start analyzing to build your history."}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAnalyses.map((item) => (
            <div 
              key={item.id}
              className="bg-[#141414] border border-[#262626] rounded-[24px] p-6 flex flex-col justify-between space-y-4 relative group hover:border-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-start justify-between">
                <span className="text-[9px] uppercase font-mono bg-white/5 text-white px-2 py-0.5 rounded border border-white/10 tracking-wider">
                  {item.scenario}
                </span>

                <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition">
                  <button 
                    onClick={() => onSaveToggle(item.id, !item.saved)}
                    style={{ backgroundColor: '#faf6cf' }}
                    className={`p-1.5 rounded-lg border border-[#262626] hover:text-white transition cursor-pointer ${
                      item.saved ? 'text-[#00E5FF]' : 'text-[#888]'
                    }`}
                    title={item.saved ? "Remove from Vault" : "Save to Vault"}
                  >
                    <Bookmark className="w-3.5 h-3.5" style={{ color: '#000000' }} />
                  </button>
                  <button 
                    onClick={() => onDeleteAnalysis(item.id)}
                    style={{ backgroundColor: '#faf6cf' }}
                    className="p-1.5 rounded-lg border border-[#262626] text-[#C97A7A] hover:text-red-400 transition cursor-pointer"
                    title="Delete permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Message excerpt */}
              <div className="space-y-1 font-sans">
                <h4 className="font-serif font-light text-white text-sm truncate">{item.title}</h4>
                <p className="text-xs text-[#a0a0a0] line-clamp-3 leading-relaxed italic font-light font-serif">
                  "{item.original_message}"
                </p>
              </div>

              {/* Diagnostic preview details */}
              <div className="border-t border-white/5 pt-3.5 flex items-center justify-between text-[11px] text-[#888] font-light font-sans">
                <div className="flex items-center gap-1.5 font-mono text-[10px]">
                  <Calendar className="w-3.5 h-3.5 text-[#00E5FF]" />
                  <span>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>

                <button 
                  onClick={() => onSelectAnalysis(item)}
                  className="text-xs font-medium text-[#00E5FF] hover:underline flex items-center gap-1 transition bg-transparent cursor-pointer font-mono"
                >
                  <span>View Diagnostics</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
