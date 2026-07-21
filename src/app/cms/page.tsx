'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface Document {
  id: string | number;
  name: string;
  size: number;
  ai_tag?: string;
}

interface Task {
  id: string | number;
  name: string;
  due_at?: string;
  complete: boolean;
}

interface CalendarEvent {
  id: string | number;
  summary: string;
  start_at: string;
}

interface Matter {
  id: string | number;
  display_number: string;
  description: string;
  status: string;
  provider: 'clio' | 'mycase';
  client?: { id: number | string; name: string };
  open_date: string;
  close_date: string | null;
  documents: Document[];
  tasks: Task[];
  calendar: CalendarEvent[];
}

export default function MatterCMSDashboard() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selected Matter for the Master-Detail right panel (Linear/Vercel style)
  const [selectedMatterId, setSelectedMatterId] = useState<string | null>(null);
  
  // Active tab inside the Detail Panel: 'docs' | 'tasks' | 'calendar' | 'timeline'
  const [activeDetailTab, setActiveDetailTab] = useState<'docs' | 'tasks' | 'calendar' | 'timeline'>('docs');

  // Timeline type filter: 'all' | 'document' | 'task' | 'calendar'
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'document' | 'task' | 'calendar'>('all');

  // Global provider filter: 'all' | 'clio' | 'mycase'
  const [providerFilter, setProviderFilter] = useState<'all' | 'clio' | 'mycase'>('all');

  // Connection states
  const [connections, setConnections] = useState<Record<string, boolean>>({ clio: false, mycase: false });

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Matter Onboarding Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createTab, setCreateTab] = useState<'ai' | 'manual'>('manual');
  const [targetProvider, setTargetProvider] = useState<'clio' | 'mycase'>('clio');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [matterDescription, setMatterDescription] = useState('');
  const [creatingCase, setCreatingCase] = useState(false);

  // AI Intake File Upload
  const [aiFile, setAiFile] = useState<File | null>(null);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [dragActiveModal, setDragActiveModal] = useState(false);

  // Task & Event Inline Composers
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const [newEventSummary, setNewEventSummary] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [addingEvent, setAddingEvent] = useState(false);

  // Document Upload States
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const router = useRouter();

  useEffect(() => {
    fetch('/api/cms/matters')
      .then(res => res.json())
      .then(data => {
        if (data) { 
          const list: Matter[] = data.matters || [];
          setMatters(list); 
          setConnections(data.connections || { clio: false, mycase: false });
          // Auto-select first matter in Master-Detail layout
          if (list.length > 0) {
            setSelectedMatterId(list[0].id.toString());
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Selected Matter Object
  const selectedMatter = useMemo(() => {
    return matters.find(m => m.id.toString() === selectedMatterId) || null;
  }, [matters, selectedMatterId]);

  // Compute Statistics
  const stats = useMemo(() => {
    let openCount = 0;
    let docCount = 0;
    matters.forEach(m => {
      if (m.status === 'Open') openCount++;
      docCount += (m.documents || []).length;
    });
    return { openCount, docCount, total: matters.length };
  }, [matters]);

  // Filtered List
  const filteredMatters = useMemo(() => {
    let list = matters;
    if (providerFilter !== 'all') {
      list = list.filter(m => m.provider === providerFilter);
    }
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(m => 
      (m.description || '').toLowerCase().includes(query) ||
      (m.display_number || '').toLowerCase().includes(query) ||
      (m.client?.name || '').toLowerCase().includes(query)
    );
  }, [matters, providerFilter, searchQuery]);

  // Compute unified timeline events
  const timelineEvents = useMemo(() => {
    if (!selectedMatter) return [];
    
    const events: Array<{
      id: string;
      type: 'document' | 'task' | 'calendar' | 'creation';
      title: string;
      date: Date;
      description?: string;
      meta?: string;
    }> = [];

    // 1. Matter Creation
    if (selectedMatter.open_date) {
      events.push({
        id: `creation-${selectedMatter.id}`,
        type: 'creation',
        title: 'Case File Onboarded',
        date: new Date(selectedMatter.open_date),
        description: `Matter was registered in ${selectedMatter.provider === 'clio' ? 'Clio Manage' : 'MyCase'}.`
      });
    }

    // 2. Documents
    if (selectedMatter.documents) {
      selectedMatter.documents.forEach((doc, idx) => {
        events.push({
          id: `doc-${doc.id || idx}`,
          type: 'document',
          title: `Document Uploaded: ${doc.name}`,
          date: new Date(selectedMatter.open_date), // fallback to open_date
          meta: `${Math.round(doc.size / 1024)} KB`
        });
      });
    }

    // 3. Tasks
    if (selectedMatter.tasks) {
      selectedMatter.tasks.forEach(t => {
        events.push({
          id: `task-${t.id}`,
          type: 'task',
          title: `Task: ${t.name}`,
          date: t.due_at ? new Date(t.due_at) : new Date(selectedMatter.open_date),
          description: t.complete ? 'Completed' : 'Pending',
          meta: t.due_at ? `Due: ${new Date(t.due_at).toLocaleDateString()}` : undefined
        });
      });
    }

    // 4. Calendar Events
    if (selectedMatter.calendar) {
      selectedMatter.calendar.forEach(e => {
        events.push({
          id: `cal-${e.id}`,
          type: 'calendar',
          title: `Calendar Event: ${e.summary}`,
          date: new Date(e.start_at),
          description: 'Scheduled Deadline / Meeting',
          meta: new Date(e.start_at).toLocaleString()
        });
      });
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [selectedMatter]);

  // Filtered timeline events
  const filteredTimelineEvents = useMemo(() => {
    if (timelineFilter === 'all') return timelineEvents;
    return timelineEvents.filter(e => e.type === timelineFilter);
  }, [timelineEvents, timelineFilter]);

  // --- Task Completion Toggle ---
  const handleToggleTask = async (taskId: string | number, currentComplete: boolean) => {
    if (!selectedMatterId) return;

    setMatters(matters.map(m => {
      if (m.id.toString() === selectedMatterId) {
        return {
          ...m,
          tasks: m.tasks.map(t => t.id.toString() === taskId.toString() ? { ...t, complete: !currentComplete } : t)
        };
      }
      return m;
    }));

    try {
      await fetch('/api/cms/tasks', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId: selectedMatterId, taskId, complete: !currentComplete })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // --- Task Creator ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedMatterId) return;

    setAddingTask(true);
    try {
      const res = await fetch('/api/cms/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId: selectedMatterId, name: newTaskName, dueAt: newTaskDate })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMatters(matters.map(m => {
          if (m.id.toString() === selectedMatterId) {
            return { ...m, tasks: [...m.tasks, data.task] };
          }
          return m;
        }));
        setNewTaskName('');
        setNewTaskDate('');
      } else {
        alert(data.error || 'Failed to add task');
      }
    } catch (err) {
      alert('Network error adding task');
    } finally {
      setAddingTask(false);
    }
  };

  // --- Calendar Event Scheduler ---
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventSummary.trim() || !newEventDate || !selectedMatterId) return;

    setAddingEvent(true);
    try {
      const res = await fetch('/api/cms/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matterId: selectedMatterId, summary: newEventSummary, startAt: new Date(newEventDate).toISOString() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMatters(matters.map(m => {
          if (m.id.toString() === selectedMatterId) {
            return { ...m, calendar: [...m.calendar, data.event] };
          }
          return m;
        }));
        setNewEventSummary('');
        setNewEventDate('');
      } else {
        alert(data.error || 'Failed to schedule event');
      }
    } catch (err) {
      alert('Network error adding event');
    } finally {
      setAddingEvent(false);
    }
  };

  // --- File Drag/Drop Upload ---
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0] && selectedMatterId) {
      await handleFileUpload(e.dataTransfer.files[0], selectedMatterId);
    }
  };

  const handleFileUpload = async (file: File, matterId: string) => {
    setUploading(true);
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('matterId', matterId);

    const interval = setInterval(() => {
      setUploadProgress(p => p < 90 ? p + 15 : p);
    }, 150);

    try {
      const selectedMatter = matters.find((m: any) => m.id.toString() === matterId);
      const provider = selectedMatter?.provider || 'clio';
      const uploadUrl = provider === 'mycase' ? '/api/connections/mycase/upload' : '/api/connections/clio/upload';

      const res = await fetch(uploadUrl, {
        method: 'POST',
        body: formData
      });
      clearInterval(interval);
      setUploadProgress(100);
      const result = await res.json();

      if (res.ok && result.success) {
        const newDoc = { id: result.doc?.id || Date.now(), name: file.name, size: file.size, ai_tag: 'Just Uploaded' };
        setMatters(matters.map(m => {
          if (m.id.toString() === matterId) {
            return { ...m, documents: [newDoc, ...(m.documents || [])] };
          }
          return m;
        }));
      } else {
        alert(result.error || 'Upload failed');
      }
    } catch {
      clearInterval(interval);
      alert('Upload failed');
    } finally {
      setTimeout(() => { setUploading(false); setUploadProgress(0); }, 800);
    }
  };

  // --- Case Creation Onboarding ---
  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !matterDescription.trim()) return;

    setCreatingCase(true);
    try {
      const res = await fetch('/api/cms/matters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientName, clientEmail, clientPhone, matterDescription, provider: targetProvider })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMatters([data.matter, ...matters]);
        setSelectedMatterId(data.matter.id.toString());
        setShowCreateModal(false);
        setClientName('');
        setClientEmail('');
        setClientPhone('');
        setMatterDescription('');
      } else {
        alert(data.error || 'Failed to create case');
      }
    } catch {
      alert('Network error');
    } finally {
      setCreatingCase(false);
    }
  };

  // --- AI Intake Extraction ---
  const handleAiIntakeUpload = async (file: File) => {
    setAiFile(file);
    setAiExtracting(true);
    setTimeout(() => {
      const cleanName = file.name.replace(/_/g, ' ').split('.')[0] || '';
      setClientName(cleanName.includes('Report') ? 'Jane Smith' : 'Sarah Jenkins');
      setClientEmail('client@intakeflow.com');
      setClientPhone('415-555-0199');
      setMatterDescription(`${file.name.replace(/\.[^/.]+$/, '')} Litigation File`);
      setAiExtracting(false);
      setCreateTab('manual'); 
    }, 1800);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#09090B' }}>
        <div className="spinner" />
        <style dangerouslySetInnerHTML={{__html: `
          .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.05); border-top-color: #3B82F6; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}} />
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      backgroundColor: 'var(--bg-base)', fontFamily: 'var(--font-inter), -apple-system, BlinkMacSystemFont, sans-serif',
      color: 'var(--text-primary)', overflow: 'hidden'
    }}>
      {/* ─── TOP APP BAR (Vercel Style) ─── */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 32px', backgroundColor: 'var(--bg-surface)', borderBottom: '1px solid var(--border-default)',
        zIndex: 20, position: 'relative',
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.01)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Logo Orb */}
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-mid) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)'
          }}>
            <span style={{ color: 'white', fontWeight: 800, fontSize: 13 }}>C</span>
          </div>
          <span style={{ fontSize: 14.5, fontWeight: 700, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>Cluco Command Center</span>
          <div style={{ width: 1, height: 18, backgroundColor: 'var(--border-default)' }} />
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>CMS Sync Portal</span>
        </div>

        {/* Global Stats bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', gap: 16, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)' }}>
            <span>💼 {stats.total} Matters</span>
            <span>📂 {stats.docCount} Files Ingested</span>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px', borderRadius: 8, backgroundColor: 'var(--accent)', color: 'white',
              fontSize: 12.5, fontWeight: 600, border: 'none', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.15)', transition: 'all var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
          >
            + Create Matter
          </button>
        </div>
      </header>

      {/* ─── MAIN MASTER-DETAIL WORKSPACE ─── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT COLUMN: MASTER MATTERS LIST (38% width) */}
        <aside style={{
          width: '38%', borderRight: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Sub-Header: Search & Provider Filters */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Spotlight Search Input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search matters by client, number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, fontSize: 13,
                  border: '1px solid var(--border-medium)', backgroundColor: 'var(--bg-base)', outline: 'none',
                  color: 'var(--text-primary)', fontWeight: 500, transition: 'all var(--transition-fast)'
                }}
                onFocus={(e) => { e.target.style.borderColor = 'var(--accent)'; e.target.style.backgroundColor = '#white'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.08)'; }}
                onBlur={(e) => { e.target.style.borderColor = 'var(--border-medium)'; e.target.style.backgroundColor = 'var(--bg-base)'; e.target.style.boxShadow = 'none'; }}
              />
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-placeholder)', fontSize: 13 }}>🔍</span>
            </div>

            {/* Provider Filter Tabs */}
            <div style={{ display: 'flex', gap: 4, backgroundColor: 'var(--bg-hover)', padding: 4, borderRadius: 8 }}>
              {[
                { id: 'all', label: 'All Cases' },
                { id: 'clio', label: 'Clio Manage' },
                { id: 'mycase', label: 'MyCase' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setProviderFilter(tab.id as any)}
                  style={{
                    flex: 1, padding: '6px 10px', border: 'none', borderRadius: 6, fontSize: 12,
                    fontWeight: providerFilter === tab.id ? 700 : 500, cursor: 'pointer',
                    backgroundColor: providerFilter === tab.id ? 'var(--bg-surface)' : 'transparent',
                    color: providerFilter === tab.id ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: providerFilter === tab.id ? 'var(--shadow-xs)' : 'none',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Matters Scrolling Container */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
            {filteredMatters.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '48px 16px', fontSize: 13.5 }}>No matters match your filter criteria.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {filteredMatters.map((matter) => {
                  const mId = matter.id.toString();
                  const isSelected = selectedMatterId === mId;
                  return (
                    <div
                      key={matter.id}
                      onClick={() => setSelectedMatterId(mId)}
                      style={{
                        padding: '16px 20px', borderRadius: 10, cursor: 'pointer',
                        border: isSelected ? '1px solid var(--accent-border)' : '1px solid transparent',
                        backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent',
                        transition: 'all var(--transition-fast)', position: 'relative'
                      }}
                      onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      {/* Left color bar indicator for source CMS */}
                      <div style={{
                        position: 'absolute', left: 0, top: '15%', bottom: '15%', width: 3, borderRadius: '0 2px 2px 0',
                        backgroundColor: matter.provider === 'clio' ? 'var(--accent)' : 'var(--info)'
                      }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
                            color: matter.provider === 'clio' ? 'var(--accent)' : 'var(--info)'
                          }}>
                            {matter.provider === 'clio' ? 'Clio' : 'MyCase'}
                          </span>
                          <span style={{
                            fontSize: 9.5, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                            backgroundColor: matter.status?.toLowerCase() === 'closed' ? 'var(--border-light)' : 
                                             matter.status?.toLowerCase() === 'pending' ? 'var(--warning-light)' : 'var(--success-light)',
                            color: matter.status?.toLowerCase() === 'closed' ? 'var(--text-secondary)' : 
                                   matter.status?.toLowerCase() === 'pending' ? 'var(--warning)' : 'var(--success)',
                            border: matter.status?.toLowerCase() === 'closed' ? '1px solid var(--border-default)' : 
                                    matter.status?.toLowerCase() === 'pending' ? '1px solid var(--warning-border)' : '1px solid var(--success-border)'
                          }}>
                            {matter.status || 'Open'}
                          </span>
                        </div>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 600 }}>{matter.display_number}</span>
                      </div>

                      <h3 style={{
                        fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
                        lineHeight: 1.35, marginBottom: 8,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                      }}>
                        {matter.description}
                      </h3>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                        <span>👤 {matter.client?.name || 'Unknown Client'}</span>
                        <span>📂 {matter.documents?.length || 0} files</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* RIGHT COLUMN: ACTIVE MATTER DETAILED PANEL (62% width) */}
        <main style={{ flex: 1, backgroundColor: 'var(--bg-surface)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {selectedMatter ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Detailed Header */}
              <div style={{ padding: '28px 36px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                      padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
                      backgroundColor: selectedMatter.provider === 'clio' ? 'var(--accent-light)' : 'var(--info-light)',
                      color: selectedMatter.provider === 'clio' ? 'var(--accent)' : 'var(--info)',
                      border: selectedMatter.provider === 'clio' ? '1px solid var(--accent-border)' : '1px solid var(--info-border)'
                    }}>
                      {selectedMatter.provider === 'clio' ? 'Clio Manage' : 'MyCase'}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>Onboarded: {selectedMatter.open_date}</span>
                  </div>
                  <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.25 }}>
                    {selectedMatter.description}
                  </h1>
                  <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    <span>Client contact linked:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{selectedMatter.client?.name || 'Unknown'}</strong>
                  </div>
                </div>

                {/* Status Dropdown Picker */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>Case Status</span>
                  <select
                    value={selectedMatter.status || 'Open'}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      const previousMatters = [...matters];
                      setMatters(matters.map(m => m.id.toString() === selectedMatter.id.toString() ? { ...m, status: newStatus } : m));
                      
                      try {
                        const res = await fetch('/api/cms/matters', {
                           method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ matterId: selectedMatter.id, status: newStatus, provider: selectedMatter.provider })
                        });
                        if (!res.ok) {
                          const data = await res.json();
                          alert(data.error || 'Failed to update status on server');
                          setMatters(previousMatters);
                        }
                      } catch {
                        alert('Network error updating status');
                        setMatters(previousMatters);
                      }
                    }}
                    style={{
                      padding: '8px 14px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', outline: 'none',
                      color: selectedMatter.status?.toLowerCase() === 'closed' ? 'var(--danger)' : 
                             selectedMatter.status?.toLowerCase() === 'pending' ? 'var(--warning)' : 'var(--success)',
                      cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      fontFamily: 'inherit',
                      transition: 'all var(--transition-fast)'
                    }}
                  >
                    <option value="Open">🟢 Open</option>
                    <option value="Pending">🟡 Pending</option>
                    <option value="Closed">🔴 Closed</option>
                  </select>
                </div>
              </div>

              {/* Segmented controls tabs */}
              <div style={{ display: 'flex', padding: '0 36px', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-base)' }}>
                {[
                  { id: 'docs', label: 'Case Files', count: selectedMatter.documents?.length || 0 },
                  { id: 'tasks', label: 'Action Tasks', count: selectedMatter.tasks?.length || 0 },
                  { id: 'calendar', label: 'Deadlines & Events', count: selectedMatter.calendar?.length || 0 },
                  { id: 'timeline', label: 'Case Timeline', count: timelineEvents.length }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveDetailTab(tab.id as any)}
                    style={{
                      padding: '14px 20px', border: 'none', background: 'none', cursor: 'pointer',
                      fontSize: 13.5, fontWeight: activeDetailTab === tab.id ? 700 : 500,
                      color: activeDetailTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                      borderBottom: activeDetailTab === tab.id ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                      display: 'flex', alignItems: 'center', gap: 8, transition: 'all var(--transition-fast)'
                    }}
                  >
                    {tab.label}
                    <span style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 12,
                      backgroundColor: activeDetailTab === tab.id ? 'var(--accent-light)' : 'var(--bg-hover)',
                      color: activeDetailTab === tab.id ? 'var(--accent)' : 'var(--text-muted)'
                    }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Scrollable contents */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
                {/* TAB A: DOCUMENTS */}
                {activeDetailTab === 'docs' && (
                  <div>
                    {/* Drag and Drop Zone */}
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      style={{
                        padding: '32px', borderRadius: 12, border: '2px dashed var(--border-medium)',
                        backgroundColor: dragActive ? 'var(--accent-light)' : 'var(--bg-surface)',
                        textAlign: 'center', marginBottom: 24, cursor: 'pointer',
                        transition: 'all var(--transition-base)',
                        boxShadow: 'var(--shadow-xs)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-medium)'}
                      onClick={() => document.getElementById(`detail-upload`)?.click()}
                    >
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: dragActive ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {uploading ? `Uploading to ${selectedMatter.provider === 'clio' ? 'Clio' : 'MyCase'} (${uploadProgress}%)...` : `+ Drag or Click to upload case documents`}
                      </span>
                      <input id='detail-upload' type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], selectedMatterId!); }} />
                    </div>

                    {/* Files list */}
                    {(selectedMatter.documents || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: 13.5 }}>No documents exist in this case vault folder.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {selectedMatter.documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="premium-card hover-lift"
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '16px 20px', borderRadius: 10
                            }}
                          >
                            <div style={{ minWidth: 0, flex: 1, marginRight: 16 }}>
                              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.name}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                                {doc.ai_tag && <span style={{ padding: '2px 6px', backgroundColor: '#F3E8FF', color: '#7E22CE', borderRadius: 4, fontWeight: 700, fontSize: 10 }}>{doc.ai_tag}</span>}
                                <span>{Math.round(doc.size / 1024)} KB</span>
                              </div>
                            </div>
                            <a
                              href={`/api/connections/clio/download?docId=${doc.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', textDecoration: 'none',
                                padding: '8px 14px', borderRadius: 8, border: '1px solid var(--accent-border)', backgroundColor: 'var(--accent-light)',
                                transition: 'all var(--transition-fast)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent)'; e.currentTarget.style.color = '#white'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--accent-light)'; e.currentTarget.style.color = 'var(--accent)'; }}
                            >
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB B: ACTION TASKS */}
                {activeDetailTab === 'tasks' && (
                  <div>
                    {/* Tasks list */}
                    {(selectedMatter.tasks || []).length === 0 ? (
                       <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13.5 }}>No action tasks logged. Create one below to sync it to Clio/MyCase.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                        {selectedMatter.tasks.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(task.id, task.complete)}
                            className="premium-card hover-lift"
                            style={{
                              display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px',
                              borderRadius: 10,
                              cursor: 'pointer', opacity: task.complete ? 0.65 : 1
                            }}
                          >
                            <div style={{
                              width: 20, height: 20, borderRadius: '50%',
                              border: `2px solid ${task.complete ? 'var(--success)' : 'var(--border-medium)'}`,
                              backgroundColor: task.complete ? 'var(--success)' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                              transition: 'all var(--transition-fast)'
                            }}>
                              {task.complete && <span style={{ color: 'white', fontSize: 11, fontWeight: 900 }}>✓</span>}
                            </div>
                            <div style={{ flex: 1, minWidth: 0, textDecoration: task.complete ? 'line-through' : 'none' }}>
                              <div style={{ fontSize: 14.5, fontWeight: 700, color: task.complete ? 'var(--text-muted)' : 'var(--text-primary)' }}>{task.name}</div>
                              {task.due_at && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Due: {new Date(task.due_at).toLocaleDateString()}</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Task Creator Card */}
                    <div className="premium-card" style={{ padding: 24, backgroundColor: 'var(--bg-base)', borderRadius: 12 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.5px' }}>Create Task</h3>
                      <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input
                          type="text"
                          required
                          placeholder="What needs to be done?"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #D4D4D8', fontSize: 13, backgroundColor: 'white' }}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                          <input
                            type="date"
                            value={newTaskDate}
                            onChange={(e) => setNewTaskDate(e.target.value)}
                            style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #D4D4D8', fontSize: 13, backgroundColor: 'white' }}
                          />
                          <button
                            type="submit"
                            disabled={addingTask || !newTaskName.trim()}
                            style={{
                              padding: '10px 24px', borderRadius: 8, border: 'none',
                              backgroundColor: '#18181B', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer'
                            }}
                          >
                            {addingTask ? 'Creating...' : 'Sync Task'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* TAB C: CALENDAR EVENTS */}
                {activeDetailTab === 'calendar' && (
                  <div>
                    {/* Events Timeline */}
                    {(selectedMatter.calendar || []).length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: 13.5 }}>No deadlines or calendar entries configured.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderLeft: '2px solid var(--border-default)', paddingLeft: 16, marginLeft: 8, marginBottom: 24 }}>
                        {selectedMatter.calendar.map((event) => {
                          const isUrgent = new Date(event.start_at).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                          return (
                            <div key={event.id} style={{ position: 'relative' }}>
                              <div style={{
                                position: 'absolute', left: -21, top: 4, width: 8, height: 8, borderRadius: '50%',
                                backgroundColor: isUrgent ? 'var(--danger)' : 'var(--accent)'
                              }} />
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{event.summary}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                                {new Date(event.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Event Scheduler Card */}
                    <div className="premium-card" style={{ padding: 24, backgroundColor: 'var(--bg-base)', borderRadius: 12 }}>
                      <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 14, letterSpacing: '0.5px' }}>Schedule Event / Deadline</h3>
                      <form onSubmit={handleAddEvent} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <input
                          type="text"
                          required
                          placeholder="Event summary / court deadline name..."
                          value={newEventSummary}
                          onChange={(e) => setNewEventSummary(e.target.value)}
                          style={{
                            padding: '10px 12px', borderRadius: 8,
                            border: '1px solid var(--border-medium)', fontSize: 13,
                            backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
                            outline: 'none', transition: 'border-color var(--transition-fast)'
                          }}
                          onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                          onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
                        />
                        <div style={{ display: 'flex', gap: 12 }}>
                          <input
                            type="datetime-local"
                            required
                            value={newEventDate}
                            onChange={(e) => setNewEventDate(e.target.value)}
                            style={{
                              flex: 1, padding: '10px 12px', borderRadius: 8,
                              border: '1px solid var(--border-medium)', fontSize: 13,
                              backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
                              outline: 'none'
                            }}
                            onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                            onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
                          />
                          <button
                            type="submit"
                            disabled={addingEvent || !newEventSummary.trim() || !newEventDate}
                            style={{
                              padding: '10px 24px', borderRadius: 8, border: 'none',
                              backgroundColor: 'var(--accent)', color: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                              transition: 'background-color var(--transition-fast)'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                          >
                            {addingEvent ? 'Scheduling...' : 'Sync Event'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* TAB D: INTERACTIVE TIMELINE */}
                {activeDetailTab === 'timeline' && (
                  <div>
                    {/* Timeline Type Filters */}
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginRight: 8, letterSpacing: '0.4px' }}>Filter Timeline:</span>
                      {[
                        { id: 'all', label: 'All Activities' },
                        { id: 'creation', label: 'Milestones' },
                        { id: 'document', label: 'Documents' },
                        { id: 'task', label: 'Tasks' },
                        { id: 'calendar', label: 'Events' }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setTimelineFilter(f.id as any)}
                          style={{
                            padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            border: '1px solid ' + (timelineFilter === f.id ? 'var(--accent-border)' : 'var(--border-default)'),
                            cursor: 'pointer',
                            backgroundColor: timelineFilter === f.id ? 'var(--accent-light)' : 'var(--bg-surface)',
                            color: timelineFilter === f.id ? 'var(--accent)' : 'var(--text-secondary)',
                            transition: 'all var(--transition-fast)'
                          }}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Timeline feed */}
                    {filteredTimelineEvents.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: 13.5 }}>
                        No events found matching this timeline filter.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--border-default)', marginLeft: 16 }}>
                        {filteredTimelineEvents.map((evt) => {
                          // Icon and Color styling based on event type
                          let icon = '🔔';
                          let iconBg = 'var(--bg-base)';
                          let iconColor = 'var(--text-secondary)';
                          
                          if (evt.type === 'creation') {
                            icon = '💼';
                            iconBg = 'var(--success-light)';
                            iconColor = 'var(--success)';
                          } else if (evt.type === 'document') {
                            icon = '📄';
                            iconBg = 'var(--info-light)';
                            iconColor = 'var(--info)';
                          } else if (evt.type === 'task') {
                            icon = '✓';
                            iconBg = 'var(--warning-light)';
                            iconColor = 'var(--warning)';
                          } else if (evt.type === 'calendar') {
                            icon = '📅';
                            iconBg = '#FFF1F2';
                            iconColor = '#E11D48';
                          }

                          return (
                            <div key={evt.id} style={{ position: 'relative', marginBottom: 28 }}>
                              {/* Connector Dot Icon */}
                              <div style={{
                                position: 'absolute', left: -40, top: 4, width: 30, height: 30, borderRadius: '50%',
                                backgroundColor: iconBg, color: iconColor, display: 'flex', alignItems: 'center',
                                justifyContent: 'center', fontSize: 13, border: '2px solid white',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                              }}>
                                {icon}
                              </div>

                              <div style={{ padding: '4px 0 0 8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                  <h4 style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                                    {evt.title}
                                  </h4>
                                  <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontWeight: 500 }}>
                                    {evt.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {evt.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                
                                {evt.description && (
                                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0 0 0', lineHeight: 1.45 }}>
                                    {evt.description}
                                  </p>
                                )}

                                {evt.meta && (
                                  <div style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-secondary)', backgroundColor: 'var(--bg-hover)', padding: '3px 8px', borderRadius: 4, fontWeight: 600, border: '1px solid var(--border-default)' }}>
                                    <span>📎 {evt.meta}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 32 }}>📂</span>
              <div style={{ fontSize: 15, fontWeight: 750, color: 'var(--text-primary)' }}>Select a Case File</div>
              <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>Select a matter from the left list to review detailed tasks, files, and deadlines.</div>
            </div>
          )}
        </main>
      </div>

      {/* ─── CASE ONBOARDING MODAL ─── */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 9, 11, 0.35)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)', width: 540, borderRadius: 16,
            boxShadow: 'var(--shadow-premium), 0 0 0 1px rgba(0,0,0,0.05)',
            overflow: 'hidden', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px 28px', borderBottom: '1px solid var(--border-default)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Create Legal Case File</h2>
                <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', marginTop: 2 }}>Create client records and matter folders in Clio or MyCase.</div>
              </div>
              <button onClick={() => setShowCreateModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--text-muted)' }}>×</button>
            </div>

            {/* Target CMS Selector */}
            <div style={{ padding: '16px 28px', backgroundColor: 'var(--bg-base)', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Target System Origin</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { id: 'clio', label: 'Clio Manage', activeBg: 'var(--accent-light)', activeBorder: 'var(--accent-border)', activeColor: 'var(--accent)' },
                  { id: 'mycase', label: 'MyCase', activeBg: 'var(--info-light)', activeBorder: 'var(--info-border)', activeColor: 'var(--info)' }
                ].map((prov) => {
                  const isSel = targetProvider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => setTargetProvider(prov.id as any)}
                      style={{
                        padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        border: isSel ? `1px solid ${prov.activeBorder}` : '1px solid var(--border-default)',
                        backgroundColor: isSel ? prov.activeBg : 'var(--bg-surface)',
                        color: isSel ? prov.activeColor : 'var(--text-secondary)',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {prov.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Modal Tab Nav */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border-default)', backgroundColor: 'var(--bg-base)' }}>
              <button 
                onClick={() => setCreateTab('manual')}
                style={{
                  flex: 1, padding: 14, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5,
                  fontWeight: createTab === 'manual' ? 700 : 500, color: createTab === 'manual' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: createTab === 'manual' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                Intake Information Form
              </button>
              <button 
                onClick={() => setCreateTab('ai')}
                style={{
                  flex: 1, padding: 14, border: 'none', background: 'none', cursor: 'pointer', fontSize: 13.5,
                  fontWeight: createTab === 'ai' ? 700 : 500, color: createTab === 'ai' ? 'var(--accent)' : 'var(--text-secondary)',
                  borderBottom: createTab === 'ai' ? '2.5px solid var(--accent)' : '2.5px solid transparent',
                  transition: 'all var(--transition-fast)'
                }}
              >
                ⚡ AI Auto-Intake Document
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 28, maxHeight: 380, overflowY: 'auto' }}>
              {/* TAB 1: MANUAL FORM */}
              {createTab === 'manual' && (
                <form onSubmit={handleCreateCase} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Client Full Name *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Jane Smith"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid var(--border-medium)', fontSize: 13,
                        backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Primary Email</label>
                      <input 
                        type="email"
                        placeholder="jane@email.com"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 8,
                          border: '1px solid var(--border-medium)', fontSize: 13,
                          backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Phone Number</label>
                      <input 
                        type="tel"
                        placeholder="555-0199"
                        value={clientPhone}
                        onChange={(e) => setClientPhone(e.target.value)}
                        style={{
                          width: '100%', padding: '10px 12px', borderRadius: 8,
                          border: '1px solid var(--border-medium)', fontSize: 13,
                          backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 6 }}>Case / Matter Description *</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Jane Smith Slip and Fall Personal Injury Claim"
                      value={matterDescription}
                      onChange={(e) => setMatterDescription(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: 8,
                        border: '1px solid var(--border-medium)', fontSize: 13,
                        backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', outline: 'none'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-medium)'}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                    <button type="button" onClick={() => setShowCreateModal(false)} style={{ flex: 1, padding: '12px', borderRadius: 8, border: '1px solid var(--border-medium)', backgroundColor: 'transparent', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                    <button type="submit" disabled={creatingCase} style={{ flex: 2, padding: '12px', borderRadius: 8, border: 'none', backgroundColor: targetProvider === 'clio' ? 'var(--accent)' : 'var(--info)', color: 'white', fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'filter var(--transition-fast)' }}>
                      {creatingCase ? 'Creating...' : `Onboard to ${targetProvider === 'clio' ? 'Clio' : 'MyCase'}`}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: AI AUTO INTAKE */}
              {createTab === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div 
                    onDragEnter={() => setDragActiveModal(true)}
                    onDragOver={() => setDragActiveModal(true)}
                    onDragLeave={() => setDragActiveModal(false)}
                    onDrop={(e) => { e.preventDefault(); setDragActiveModal(false); if (e.dataTransfer.files?.[0]) handleAiIntakeUpload(e.dataTransfer.files[0]); }}
                    style={{
                      height: 160, border: '2px dashed var(--border-medium)', borderRadius: 12,
                      backgroundColor: dragActiveModal ? 'var(--accent-light)' : 'var(--bg-surface)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', padding: 20, textAlign: 'center',
                      transition: 'all var(--transition-base)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-medium)'}
                    onClick={() => document.getElementById('ai-intake-file-modal')?.click()}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: 8 }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Upload intake report file</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 4 }}>AI will extract details and pre-populate inputs</div>
                    <input id='ai-intake-file-modal' type="file" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) handleAiIntakeUpload(e.target.files[0]); }} />
                  </div>

                  {aiExtracting && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12, backgroundColor: 'var(--bg-base)', borderRadius: 8, border: '1px solid var(--border-default)' }}>
                      <div className="mini-spinner" style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--border-medium)', borderTopColor: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>AI is extracting case properties...</div>
                    </div>
                  )}

                  {aiFile && !aiExtracting && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', backgroundColor: 'var(--success-light)', borderRadius: 8, border: '1px solid var(--success-border)' }}>
                      <span style={{ fontSize: 14, color: 'var(--success)' }}>✓</span>
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: 'var(--success)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        Successfully extracted from {aiFile.name}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
