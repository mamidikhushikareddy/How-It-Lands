/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Users, Database, FileText, Bookmark, Quote, Award, 
  Settings, Trash, Check, Plus, Edit, RefreshCw 
} from 'lucide-react';
import { User, UserProfile, Template, Playbook, BlogPost, Testimonial } from '../../../types';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';

interface AdminPanelProps {
  users: User[];
  templates: Template[];
  playbooks: Playbook[];
  blog_posts: BlogPost[];
  testimonials: Testimonial[];
  onAdminAction: (payload: {
    type: 'template' | 'playbook' | 'blog' | 'testimonial' | 'user';
    action: 'save' | 'delete' | 'update';
    item: any;
  }) => Promise<void>;
  currentUser?: User;
}

export default function AdminPanel({
  users,
  templates,
  playbooks,
  blog_posts,
  testimonials,
  onAdminAction,
  currentUser
}: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'templates' | 'blog' | 'testimonials'>('users');
  
  // Create / Edit temporary states
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [newType, setNewType] = useState<'template' | 'blog' | 'testimonial' | null>(null);

  // Deletion and toast notification states
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ item: any, type: 'template' | 'blog' | 'testimonial' | 'user' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Stats calculators
  const totalUsersCount = users.length;

  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    let type: 'template' | 'playbook' | 'blog' | 'testimonial' | 'user' = 'template';
    if (activeTab === 'templates') type = 'template';
    else if (activeTab === 'blog') type = 'blog';
    else if (activeTab === 'testimonials') type = 'testimonial';
    else if (activeTab === 'users') type = 'user';

    await onAdminAction({
      type,
      action: 'save',
      item: editingItem
    });

    setEditingItem(null);
    setNewType(null);
    showToast('Record successfully saved to system database.');
  };

  const handleDelete = (item: any, type: 'template' | 'blog' | 'testimonial' | 'user') => {
    setDeleteConfirmItem({ item, type });
  };

  const confirmDelete = async () => {
    if (!deleteConfirmItem) return;
    setIsDeleting(true);
    try {
      await onAdminAction({
        type: deleteConfirmItem.type,
        action: 'delete',
        item: deleteConfirmItem.item
      });
      showToast(`${deleteConfirmItem.type.charAt(0).toUpperCase() + deleteConfirmItem.type.slice(1)} deleted successfully.`);
      setDeleteConfirmItem(null);
    } catch (e) {
      console.error('Deletion failed:', e);
    } finally {
      setIsDeleting(false);
    }
  };


  const startNewItem = (type: 'template' | 'blog' | 'testimonial' | 'user') => {
    setNewType(type as any);
    if (type === 'template') {
      setEditingItem({
        id: 't_' + Math.random().toString(36).substr(2, 9),
        title: '',
        scenario: 'general',
        category: 'Personal',
        draft: '',
        goal: 'Be polite but clear'
      });
    } else if (type === 'blog') {
      setEditingItem({
        id: 'b_' + Math.random().toString(36).substr(2, 9),
        title: '',
        slug: '',
        excerpt: '',
        content: '',
        author: 'Pradeep',
        created_at: new Date().toISOString(),
        read_time: '5 min'
      });
    } else if (type === 'testimonial') {
      setEditingItem({
        id: 'test_' + Math.random().toString(36).substr(2, 9),
        name: '',
        role: '',
        avatar: '',
        text: '',
        stars: 5,
        scenarios_resolved: 'Salary negotiation'
      });
    } else if (type === 'user') {
      setEditingItem({
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        name: '',
        email: '',
        password: '',
        role: 'user',
        plan: 'free'
      });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-6 rounded-2xl animate-fade-in border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0B0E14] text-slate-900 dark:text-slate-100" >
      {/* Toast Notification */}
      {successToast && (
        <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl border border-emerald-500/20 shadow-lg flex items-center justify-between animate-fade-in font-sans">
          <div className="flex items-center gap-2.5">
            <Check className="w-4 h-4 bg-white/20 p-0.5 rounded-full" />
            <span className="text-xs font-semibold">{successToast}</span>
          </div>
          <button type="button" onClick={() => setSuccessToast(null)} className="text-white/70 hover:text-white font-bold text-xs cursor-pointer px-1">✕</button>
        </div>
      )}

      {/* Top dashboard metadata */}
      <div className="border-b border-slate-200 dark:border-white/10 pb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1 font-sans">
          <span className="text-[10px] uppercase font-mono tracking-widest text-sky-700 dark:text-cyan-400 font-bold flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5" />
            ADMIN CONTROL TERMINAL
          </span>
          <h1 className="text-2xl font-light font-serif text-slate-900 dark:text-slate-100">Database & Content Managers</h1>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-light">Admin operations for scenario templates, playbooks, testimonials, and blog dispatchers.</p>
        </div>

        {/* Admin Tabs */}
        <div className="flex flex-wrap gap-1.5 bg-slate-100 dark:bg-[#141821] border border-slate-200 dark:border-white/10 p-1 rounded-xl">
          {(['users', 'templates', 'blog', 'testimonials'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingItem(null); }} 
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition cursor-pointer ${
                activeTab === tab 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-xs' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 bg-transparent'
              }`}
            >
              {tab.toUpperCase()} ({tab === 'users' ? users.length : tab === 'templates' ? templates.length : tab === 'blog' ? blog_posts.length : testimonials.length})
            </button>
          ))}
        </div>
      </div>

      {/* Stats Board */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#141821] border border-slate-200 dark:border-white/10 p-4 rounded-xl text-center space-y-1 shadow-xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 block uppercase font-mono font-medium">Total Members</span>
          <span className="text-2xl font-semibold text-slate-900 dark:text-slate-100 font-serif">{totalUsersCount}</span>
        </div>
      </div>

      {/* Editor Drawer panel */}
      {editingItem && (
        <form onSubmit={handleSave} className="bg-white dark:bg-[#141821] p-6 rounded-2xl border border-slate-200 dark:border-white/10 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 font-sans">
            <Edit className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
            Editing {activeTab === 'templates' ? 'Scenario Template' : activeTab === 'blog' ? 'Blog Dispatch' : activeTab === 'testimonials' ? 'Testimonial Review' : 'User Account Details'}
          </h3>

          {activeTab === 'users' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Full Name</label>
                <input 
                  type="text" 
                  value={editingItem.name || ''} 
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                  placeholder="e.g. Kia"
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-sans font-light"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Email Address</label>
                <input 
                  type="email" 
                  value={editingItem.email || ''} 
                  onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                  required
                  placeholder="e.g. alex@example.com"
                  disabled={!!editingItem.created_at}
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-sans font-light disabled:opacity-50"
                />
              </div>
              {!editingItem.created_at && (
                <div className="space-y-1.5">
                  <label className="text-slate-600 dark:text-slate-400 font-medium">Password (Minimum 8 chars)</label>
                  <input 
                    type="password" 
                    value={editingItem.password || ''} 
                    onChange={(e) => setEditingItem({ ...editingItem, password: e.target.value })}
                    required
                    placeholder="Enter password"
                    className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500 font-sans font-light"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Role / Authorization Level</label>
                <select
                  value={editingItem.role || 'user'}
                  onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                  className="w-full p-2.5 bg-white dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden font-sans font-light"
                >
                  <option value="user">User (Standard Access)</option>
                  <option value="admin">Admin (Full Control)</option>
                  <option value="moderator">Moderator (Content Review)</option>
                  <option value="editor">Editor (Authoring/Blogs)</option>
                </select>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">Title</label>
                <input 
                  type="text" 
                  value={editingItem.title} 
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">Category</label>
                <input 
                  type="text" 
                  value={editingItem.category} 
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-500 dark:text-slate-400">Original Draft text</label>
                <textarea 
                  value={editingItem.draft} 
                  onChange={(e) => setEditingItem({ ...editingItem, draft: e.target.value })}
                  required
                  className="w-full h-24 p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none font-sans font-light"
                />
              </div>
            </div>
          )}

          {activeTab === 'blog' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">Title</label>
                <input 
                  type="text" 
                  value={editingItem.title} 
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">Slug (URL)</label>
                <input 
                  type="text" 
                  value={editingItem.slug} 
                  onChange={(e) => setEditingItem({ ...editingItem, slug: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-500 dark:text-slate-400">Excerpt</label>
                <input 
                  type="text" 
                  value={editingItem.excerpt} 
                  onChange={(e) => setEditingItem({ ...editingItem, excerpt: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Article Markdown Content</label>
                <textarea 
                  value={editingItem.content} 
                  onChange={(e) => setEditingItem({ ...editingItem, content: e.target.value })}
                  required
                  className="w-full h-44 p-2.5 bg-white dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden resize-none font-sans font-light"
                />
              </div>
            </div>
          )}

          {activeTab === 'testimonials' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 font-medium">User Name</label>
                <input 
                  type="text" 
                  value={editingItem.name} 
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#151B28] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-sky-500"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Role / Occupation</label>
                <input 
                  type="text" 
                  value={editingItem.role} 
                  onChange={(e) => setEditingItem({ ...editingItem, role: e.target.value })}
                  required
                  className="w-full p-2.5 bg-white dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-slate-600 dark:text-slate-400 font-medium">Feedback message</label>
                <textarea 
                  value={editingItem.text} 
                  onChange={(e) => setEditingItem({ ...editingItem, text: e.target.value })}
                  required
                  className="w-full h-20 p-2.5 bg-white dark:bg-[#10141C] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:outline-hidden resize-none font-sans font-light"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button type="submit" variant="primary" size="sm">
              Save Database Record
            </Button>
            <button 
              type="button" 
              onClick={() => { setEditingItem(null); setNewType(null); }} 
              className="px-5 py-2 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active lists */}
      <Card className="p-6">
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-800 dark:text-slate-200 font-bold block">User Accounts Directory</span>
              <Button onClick={() => startNewItem('user')} variant="primary" size="sm" className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add User or Admin
              </Button>
            </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-mono">
                    <th className="pb-3 font-semibold">User details</th>
                    <th className="pb-3 font-semibold">Usage count</th>
                    <th className="pb-3 font-semibold text-right font-mono">Overhead operations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-light">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                      <td className="py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 dark:text-slate-100 block font-sans">{u.name}</span>
                          {u.role && u.role !== 'user' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[8px] font-mono uppercase font-bold">
                              {u.role}
                            </span>
                          )}
                        </div>
                        <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono">{u.email}</span>
                      </td>
                      <td className="py-3.5 text-slate-700 dark:text-slate-300 font-mono">{u.usage_count_month || 0} analyses</td>
                      <td className="py-3.5 text-right space-x-1.5">
                        <button onClick={() => setEditingItem(u)} className="px-2 py-1 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 rounded text-[10px] font-mono font-bold transition cursor-pointer">EDIT</button>
                        <button onClick={() => handleDelete(u, 'user')} className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded cursor-pointer" title="Delete Account"><Trash className="w-3.5 h-3.5 inline" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-800 dark:text-slate-200 font-bold">Pre-built Scenarios Database</span>
              <Button onClick={() => startNewItem('template')} variant="primary" size="sm" className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add Starter Template
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((t) => (
                <div key={t.id} className="p-4 rounded-xl flex flex-col justify-between space-y-3 relative group bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] uppercase font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-1.5 py-0.5 rounded font-bold border border-slate-200 dark:border-slate-700">{t.category}</span>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        <button onClick={() => setEditingItem(t)} className="p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(t, 'template')} className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded cursor-pointer"><Trash className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs font-sans">{t.title}</h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2 font-sans font-normal">"{t.draft}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'blog' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-800 dark:text-slate-200 font-bold">Informational Articles</span>
              <Button onClick={() => startNewItem('blog')} variant="primary" size="sm" className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Dispatch New Post
              </Button>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {blog_posts.map((post) => (
                <div key={post.id} className="py-3.5 flex justify-between items-center gap-4 group font-sans">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-mono text-slate-500 dark:text-slate-400 block font-light">{post.created_at} • By {post.author}</span>
                    <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{post.title}</h4>
                    <p className="text-[10.5px] text-slate-600 dark:text-slate-400 font-light">{post.excerpt}</p>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => setEditingItem(post)} className="p-1.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                    <button onClick={() => handleDelete(post, 'blog')} className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded cursor-pointer"><Trash className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'testimonials' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-800 dark:text-slate-200 font-bold">Social Testimonials & Reviews</span>
              <Button onClick={() => startNewItem('testimonial')} variant="primary" size="sm" className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Create Review
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {testimonials.map((test) => (
                <div key={test.id} className="p-4 rounded-xl relative group space-y-2 font-sans bg-white dark:bg-[#151B28] border border-slate-200 dark:border-slate-800 shadow-xs">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">{test.name}</h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{test.role}</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => setEditingItem(test)} className="p-1 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded cursor-pointer"><Edit className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(test, 'testimonial')} className="p-1 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded cursor-pointer"><Trash className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed italic font-normal">"{test.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}


      </Card>

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-[#141821] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl text-slate-900 dark:text-slate-100 font-sans">
            <div className="space-y-1">
              <h4 className="text-base font-bold font-serif flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Trash className="w-5 h-5 text-rose-600 dark:text-red-500" />
                Confirm Deletion
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Are you sure you want to permanently delete this {deleteConfirmItem.type} from the database? This action is irreversible.
              </p>
              {deleteConfirmItem.type === 'user' && (
                <div className="mt-2 p-2 bg-rose-50 dark:bg-red-500/10 border border-rose-200 dark:border-red-500/20 rounded-lg text-[11px] text-rose-700 dark:text-red-400">
                  Deleting user <span className="font-semibold">{deleteConfirmItem.item.name}</span> ({deleteConfirmItem.item.email}) will also remove their associated profile and analysis history.
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
