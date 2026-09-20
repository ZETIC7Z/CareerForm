'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  Trash2,
  Copy,
  Edit3,
  ExternalLink,
  Search,
  Sparkles,
  ShieldCheck,
  Download,
  AlertCircle,
  FolderOpen,
  ArrowRight,
  RefreshCw,
  LogOut,
  User,
  Zap,
  X,
} from 'lucide-react';
import GlassNavigation from '@/components/glass-navigation';
import TipJarModal, { TipJarButton } from '@/components/tip-jar-modal';

interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  data: any;
  completionRate?: number;
  lastModified: string;
  createdAt: string;
  isFavorite?: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [tipModalOpen, setTipModalOpen] = useState(false);

  // Rename state
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Load user session & projects
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();

      if (!userData.ok || !userData.user) {
        // Not logged in -> redirect to home with auth prompt
        router.push('/?action=signin');
        return;
      }
      setUser(userData.user);

      const projRes = await fetch('/api/projects');
      const projData = await projRes.json();
      if (projData.ok && Array.isArray(projData.projects)) {
        setProjects(projData.projects);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Create Project
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim(),
        }),
      });

      const data = await res.json();
      if (data.ok && data.project) {
        setProjects([data.project, ...projects]);
        setCreateModalOpen(false);
        setNewTitle('');
        setNewDesc('');
        // Navigate to builder with this project
        router.push(`/builder?project=${data.project.id}`);
      } else {
        alert(data.error || 'Could not create project');
      }
    } catch {
      alert('Network error while creating project');
    } finally {
      setIsCreating(false);
    }
  };

  // Duplicate Project
  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/projects/${id}/duplicate`, { method: 'POST' });
      const data = await res.json();
      if (data.ok && data.project) {
        setProjects([data.project, ...projects]);
      }
    } catch {
      alert('Failed to duplicate project');
    }
  };

  // Delete Project
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setProjects(projects.filter((p) => p.id !== id));
      }
    } catch {
      alert('Failed to delete project');
    }
  };

  // Rename Project
  const handleSaveRename = async (id: string) => {
    if (!renameValue.trim()) return;
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: renameValue.trim() }),
      });
      if (res.ok) {
        setProjects(
          projects.map((p) => (p.id === id ? { ...p, title: renameValue.trim() } : p))
        );
        setRenameId(null);
      }
    } catch {
      alert('Failed to rename project');
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const mostRecentProject = projects.length > 0 ? projects[0] : null;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#020617', color: '#f8fafc' }}>
        <GlassNavigation />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh', gap: '16px' }}>
          <RefreshCw size={36} className="animate-spin text-cyan-500" />
          <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading your CareerForm projects &amp; sync data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#020617', color: '#f8fafc', paddingBottom: '80px' }}>
      <GlassNavigation />

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '120px 24px 0 24px' }}>
        {/* User Profile & Account Banner */}
        <section
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.85) 0%, rgba(30, 41, 59, 0.65) 100%)',
            border: '1px solid rgba(6, 182, 212, 0.25)',
            borderRadius: '20px',
            padding: '28px 32px',
            marginBottom: '36px',
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(6, 182, 212, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Ambient Glow Accent */}
          <div
            style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '200px',
              height: '200px',
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#ffffff',
                  boxShadow: '0 8px 24px rgba(6, 182, 212, 0.4)',
                }}
              >
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                    Welcome, {user?.name || 'Applicant'}!
                  </h1>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      color: '#10b981',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '3px 10px',
                      borderRadius: '999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <ShieldCheck size={13} /> FREE TIER · PRO READY
                  </span>
                </div>
                <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0 0' }}>
                  {user?.email} · All PDS edits automatically synced with MongoDB Atlas
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="btn btn-primary"
                style={{
                  height: '44px',
                  padding: '0 20px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '13.5px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Plus size={18} /> New PDS Project
              </button>

              <TipJarButton onClick={() => setTipModalOpen(true)} />
            </div>
          </div>
        </section>

        {/* Quick Resume Hero: Continue where you left off */}
        {mostRecentProject && (
          <section
            style={{
              background: 'linear-gradient(90deg, rgba(6, 182, 212, 0.12) 0%, rgba(59, 130, 246, 0.08) 100%)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '16px',
              padding: '20px 24px',
              marginBottom: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'rgba(6, 182, 212, 0.2)',
                  color: '#06b6d4',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={22} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#06b6d4' }}>
                    Quick Resume
                  </span>
                  <span style={{ color: '#64748b', fontSize: '12px' }}>• Last Session</span>
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '2px 0 0 0', color: '#ffffff' }}>
                  {mostRecentProject.title}
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Completion</span>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#38bdf8' }}>
                  {mostRecentProject.completionRate ?? 0}%
                </div>
              </div>

              <Link
                href={`/builder?project=${mostRecentProject.id}`}
                className="btn btn-primary"
                style={{
                  height: '40px',
                  padding: '0 18px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                Continue Editing <ArrowRight size={15} />
              </Link>
            </div>
          </section>
        )}

        {/* Projects Controls & Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
              Your PDS Projects ({projects.length})
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              Manage multiple Personal Data Sheet submissions for different agencies and positions
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '360px' }}>
            <div
              style={{
                position: 'relative',
                width: '100%',
              }}
            >
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '10px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#ffffff',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <div
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: '16px',
            }}
          >
            <FolderOpen size={48} style={{ color: '#475569', margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: '#e2e8f0', margin: '0 0 6px 0' }}>
              {searchQuery ? 'No matching projects found' : 'No projects created yet'}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto 18px' }}>
              {searchQuery
                ? `No projects matched "${searchQuery}". Try a different search.`
                : 'Start your official 2026 Civil Service Personal Data Sheet with cloud auto-sync.'}
            </p>
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="btn btn-primary"
              style={{ height: '38px', padding: '0 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 600 }}
            >
              <Plus size={16} /> Create First Project
            </button>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
              gap: '20px',
            }}
          >
            {filteredProjects.map((project) => {
              const isRenaming = renameId === project.id;
              const formattedDate = new Date(project.lastModified).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={project.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.09)',
                    borderRadius: '16px',
                    padding: '22px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div>
                    {/* Top Row: Icon & Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <span
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '10px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: '#06b6d4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FileText size={18} />
                      </span>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: 'rgba(16, 185, 129, 0.12)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                          }}
                        >
                          Synced
                        </span>
                      </div>
                    </div>

                    {/* Title or Rename Input */}
                    {isRenaming ? (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '8px',
                            background: '#090d16',
                            border: '1px solid #06b6d4',
                            color: '#ffffff',
                            fontSize: '14px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRename(project.id)}
                          className="btn btn-primary"
                          style={{ padding: '0 12px', fontSize: '12px', borderRadius: '8px' }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setRenameId(null)}
                          style={{ padding: '0 8px', background: 'transparent', color: '#64748b', fontSize: '12px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <h4
                        style={{
                          fontSize: '16px',
                          fontWeight: 700,
                          margin: '0 0 6px 0',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span className="truncate">{project.title}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setRenameId(project.id);
                            setRenameValue(project.title);
                          }}
                          style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                          title="Rename project"
                        >
                          <Edit3 size={13} />
                        </button>
                      </h4>
                    )}

                    {project.description && (
                      <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '0 0 12px 0', lineHeight: 1.4 }}>
                        {project.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div style={{ margin: '14px 0 12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11.5px', color: '#94a3b8', marginBottom: '5px' }}>
                        <span>Completion</span>
                        <span style={{ fontWeight: 600, color: '#38bdf8' }}>{project.completionRate ?? 0}%</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${project.completionRate ?? 0}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                            borderRadius: '3px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#64748b', marginBottom: '16px' }}>
                      <Clock size={12} />
                      <span>Edited {formattedDate}</span>
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(project.id)}
                        title="Duplicate project"
                        style={{
                          background: 'rgba(255, 255, 255, 0.06)',
                          border: '1px solid rgba(255, 255, 255, 0.09)',
                          color: '#94a3b8',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <Copy size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(project.id, project.title)}
                        title="Delete project"
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          color: '#ef4444',
                          padding: '6px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '12px',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>

                    <Link
                      href={`/builder?project=${project.id}`}
                      className="btn btn-primary"
                      style={{
                        height: '34px',
                        padding: '0 14px',
                        borderRadius: '8px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      Open Builder <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      {createModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setCreateModalOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#090d16',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 24px 64px rgba(0, 0, 0, 0.8), 0 0 32px rgba(6, 182, 212, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#ffffff' }}>
                  Create New PDS Project
                </h3>
                <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Your form data will be saved and auto-synced to your account
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DepEd Teacher I Application, CSC Regional PDS"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#040711',
                    border: '1px solid #1e293b',
                    color: '#ffffff',
                    fontSize: '13.5px',
                    outline: 'none',
                  }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#cbd5e1', marginBottom: '6px' }}>
                  Notes / Description (Optional)
                </label>
                <textarea
                  placeholder="e.g. For submission on October 2026 at DepEd Division office"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: '#040711',
                    border: '1px solid #1e293b',
                    color: '#ffffff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary"
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {isCreating ? 'Creating…' : 'Create & Open'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tip Jar Modal */}
      <TipJarModal open={tipModalOpen} onClose={() => setTipModalOpen(false)} />
    </div>
  );
}
