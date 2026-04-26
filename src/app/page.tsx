"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import UploadModal from '../components/UploadModal';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [modalType, setModalType] = useState<'timetable' | 'board'>('timetable');
  const [modalOpen, setModalOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', university: '', age: '' });
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [view, setView] = useState<'subjects' | 'notes'>('subjects');
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);

  useEffect(() => {
    const savedUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') : null;
    if (!savedUserId) {
      setAuthLoading(false);
      router.replace('/login');
      return;
    }

    fetchUser(savedUserId);
  }, []);

  const fetchUser = async (userId?: string) => {
    try {
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const res = await fetch(`/api/user${query}`);
      const data = await res.json();

      if (data?.error) {
        console.error('Failed to fetch user:', data.error);
        router.replace('/login');
        return;
      }

      setUser(data);
      setSubjects(data.subjects || []);
      
      if (selectedSubject) {
        const updated = data.subjects.find((s: any) => s.id === selectedSubject.id);
        if (updated) setSelectedSubject(updated);
      }

      setEditForm({
        name: data.name || '',
        university: data.university || '',
        age: data.age?.toString() || '',
      });
    } catch (error) {
      console.error('Failed to fetch user:', error);
      router.replace('/login');
    } finally {
      setLoading(false);
      setAuthLoading(false);
    }
  };

  const handleManualAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName) return;

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newSubjectName }),
      });
      if (res.ok) {
        setNewSubjectName('');
        setIsAddingSubject(false);
        fetchUser();
      }
    } catch (error) {
      console.error('Failed to add subject:', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('この科目と中のノートをすべて削除しますか？')) return;
    try {
      await fetch(`/api/subjects?id=${id}`, { method: 'DELETE' });
      fetchUser();
      if (selectedSubject?.id === id) {
        setView('subjects');
        setSelectedSubject(null);
      }
    } catch (error) {
      console.error('Failed to delete subject:', error);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        setUser(updatedUser);
        setIsEditingProfile(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}時間`;
  };

  const toggleLayout = () => setIsMobileLayout(prev => !prev);

  const noteGradientColors = [
    ['#F97316', '#FACC15'],
    ['#22C55E', '#14B8A6'],
    ['#3B82F6', '#8B5CF6'],
    ['#EF4444', '#EC4899'],
    ['#0EA5E9', '#9333EA'],
    ['#F43F5E', '#FB7185'],
  ];

  const getNoteGradient = (note: any) => {
    const key = note?.id ?? note?.title ?? '';
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % noteGradientColors.length;
    }
    const [from, to] = noteGradientColors[hash];
    return `linear-gradient(135deg, ${from} 0%, ${to} 100%)`;
  };

  if (authLoading || loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>認証情報を確認しています...</p>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${isMobileLayout ? styles.mobileContainer : ''}`}>
      <div className={styles.mobileHeader}>
        <div className={styles.logo}>NoteGenius</div>
        <div className={styles.headerActions}>
          <button className="button-secondary" onClick={toggleLayout}>
            {isMobileLayout ? '💻 PCモード' : '📱 スマホモード'}
          </button>
          <button className="button-secondary" onClick={() => { setModalType('timetable'); setModalOpen(true); }}>
            <span>📅</span>
          </button>
          <button className="button-primary" onClick={() => { setModalType('board'); setModalOpen(true); }}>
            <span>📸</span>
          </button>
        </div>
      </div>

      {/* サイドバー */}
      <aside className={`${styles.sidebar} animate-fade-in`}>
        <div className={styles.logo}>
          <span style={{ fontSize: '1.8rem' }}>🎓</span> NoteGenius
        </div>

        {user && (
          <div className={styles.profileWidget}>
            {!isEditingProfile ? (
              <>
                <div className={styles.profileHeader}>
                  <h3>{user.name}</h3>
                  <button 
                    className={styles.editButton}
                    onClick={() => setIsEditingProfile(true)}
                    title="プロフィールを編集"
                  >
                    ✏️
                  </button>
                </div>
                <p>{user.university} • {user.age}歳</p>
                <div className={styles.stats}>
                  <div className={styles.statItem}>
                    <span>総学習時間</span>
                    <strong>{formatTime(user.studyTime)}</strong>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleProfileUpdate} className={styles.editForm}>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})}
                  placeholder="名前"
                  className={styles.input}
                  required
                />
                <input 
                  type="text" 
                  value={editForm.university} 
                  onChange={e => setEditForm({...editForm, university: e.target.value})}
                  placeholder="大学名"
                  className={styles.input}
                />
                <input 
                  type="number" 
                  value={editForm.age} 
                  onChange={e => setEditForm({...editForm, age: e.target.value})}
                  placeholder="年齢"
                  className={styles.input}
                />
                <div className={styles.formActions}>
                  <button type="submit" className={styles.saveButton}>保存</button>
                  <button 
                    type="button" 
                    onClick={() => setIsEditingProfile(false)}
                    className={styles.cancelButton}
                  >
                    ×
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <nav className={styles.nav}>
          <button className={`${styles.navItem} ${view === 'subjects' ? styles.navItemActive : ''}`} onClick={() => setView('subjects')}>
            <span className={styles.navIcon}>📚</span> 科目一覧
          </button>
          <button className={styles.navItem}>
            <span className={styles.navIcon}>📅</span> 時間割管理
          </button>
          <button className={styles.navItem}>
            <span className={styles.navIcon}>⚙️</span> 設定
          </button>
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className={styles.mainContent}>
        <div className={`${styles.header} animate-fade-in`} style={{ animationDelay: '0.1s' }}>
          <div>
            {view === 'notes' && selectedSubject ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  className={styles.backButton}
                  onClick={() => { setView('subjects'); setSelectedSubject(null); }}
                >
                  ←
                </button>
                <h1 style={{ margin: 0 }}>{selectedSubject.name} のノート</h1>
              </div>
            ) : (
              <h1>ダッシュボード</h1>
            )}
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              {view === 'subjects' ? '学習状況をひと目で把握しましょう' : '保存された板書メモを確認できます'}
            </p>
          </div>
          <div className={styles.headerActions}>
            <button 
              className="button-secondary"
              onClick={() => { setModalType('timetable'); setModalOpen(true); }}
            >
              <span>📅</span> 時間割をアップロード
            </button>
            <button 
              className="button-primary"
              onClick={() => { setModalType('board'); setModalOpen(true); }}
            >
              <span>📸</span> 黒板を撮影
            </button>
          </div>
        </div>

        {view === 'subjects' ? (
          subjects.length === 0 ? (
            <div className={`glass-panel ${styles.subjectCard} animate-fade-in`} style={{ 
              animationDelay: '0.2s', 
              gridColumn: '1 / -1', 
              textAlign: 'center',
              padding: '4rem 2rem',
              alignItems: 'center',
              borderStyle: 'dashed',
              background: 'rgba(255, 255, 255, 0.02)'
            }}>
              <span style={{ fontSize: '3rem', marginBottom: '1rem' }}>👋</span>
              <h3 style={{ marginBottom: '0.5rem' }}>NoteGeniusへようこそ！</h3>
              <p style={{ color: 'var(--text-secondary)' }}>
                まだ登録されている科目がありません。<br/>
                上の「時間割をアップロード」から、時間割の写真を読み込ませてみましょう！
              </p>
            </div>
          ) : (
            <div className={styles.grid}>
              {subjects.map((subject: any, index: number) => (
                <div 
                  key={subject.id} 
                  className={`glass-panel ${styles.subjectCard} animate-fade-in`}
                  style={{ animationDelay: `${0.2 + index * 0.1}s` }}
                  onClick={() => { setSelectedSubject(subject); setView('notes'); }}
                >
                  <div className={styles.subjectHeader}>
                    <h3 style={{ marginBottom: 0 }}>{subject.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button 
                        className={styles.deleteIconButton}
                        onClick={(e) => { e.stopPropagation(); handleDeleteSubject(subject.id); }}
                      >
                        🗑️
                      </button>
                      <div 
                        className={styles.subjectColor} 
                        style={{ backgroundColor: subject.color || 'var(--primary)' }}
                      />
                    </div>
                  </div>
                  <div className={styles.subjectMeta}>
                    <span>📄 ノート: {subject.notes?.length || 0}件</span>
                  </div>
                </div>
              ))}

              {/* 手動追加カード */}
              {!isAddingSubject ? (
                <div 
                  className={`glass-panel ${styles.subjectCard} ${styles.addSubjectCard} animate-fade-in`}
                  onClick={() => setIsAddingSubject(true)}
                  style={{ borderStyle: 'dashed', background: 'transparent' }}
                >
                  <span style={{ fontSize: '2rem' }}>+</span>
                  <span>科目を手動で登録</span>
                </div>
              ) : (
                <div className={`glass-panel ${styles.subjectCard} animate-fade-in`}>
                  <form onSubmit={handleManualAddSubject} className={styles.manualForm}>
                    <input 
                      type="text" 
                      placeholder="科目名を入力..."
                      value={newSubjectName}
                      onChange={e => setNewSubjectName(e.target.value)}
                      autoFocus
                      className={styles.input}
                    />
                    <div className={styles.formActions}>
                      <button type="submit" className="button-primary">追加</button>
                      <button type="button" className="button-secondary" onClick={() => setIsAddingSubject(false)}>戻る</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )
        ) : (
          <div className={styles.noteList}>
            {selectedSubject?.notes?.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '3rem' }}>
                この科目のノートはまだありません。
              </p>
            ) : (
              <div className={styles.grid}>
                {selectedSubject?.notes?.map((note: any) => (
                  <div 
                    key={note.id} 
                    className={`glass-panel ${styles.noteCard} animate-fade-in`}
                    style={{
                      backgroundImage: getNoteGradient(note),
                      color: '#fff',
                      borderColor: 'rgba(255, 255, 255, 0.2)',
                    }}
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString()}</div>
                    <h3>{note.title}</h3>
                    <p style={{ opacity: 0.9, fontSize: '0.9rem' }}>{note.content.slice(0, 80)}...</p>
                    <div className={styles.noteFooter}>詳しく見る →</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
        {/* Bottom navigation for mobile */}
        <nav className={styles.bottomNav}>
          <button className={styles.bottomNavItem} onClick={() => { setModalType('timetable'); setModalOpen(true); }}>
            <span>📅</span>
            <span>時間割</span>
          </button>
          <button className={styles.bottomNavItem} onClick={() => { setModalType('board'); setModalOpen(true); }}>
            <span>📸</span>
            <span>黒板</span>
          </button>
        </nav>
        <UploadModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          type={modalType}
          onUploadSuccess={(res) => {
            console.log('Upload success:', res);

            if (modalType === 'timetable') {
              if (res.createdSubjects?.length) {
                setSubjects((prev) => [...prev, ...res.createdSubjects]);
              }
              alert(`✅ 時間割の読み取り完了\n\n科目を新しく登録しました！`);
            } else {
              const note = res.note;
              const subjectData = res.subject;

              if (note && subjectData) {
                setSubjects((prev) => {
                  const existingIndex = prev.findIndex(
                    (s: any) => s.id === subjectData.id || s.name === subjectData.name
                  );

                  if (existingIndex >= 0) {
                    const updated = [...prev];
                    const target = updated[existingIndex];
                    updated[existingIndex] = {
                      ...target,
                      notes: [...(target.notes || []), note],
                    };
                    return updated;
                  }

                  return [...prev, { ...subjectData, notes: [note] }];
                });

                if (selectedSubject?.name === subjectData.name) {
                  setSelectedSubject((prev: any) => prev ? { ...prev, notes: [...(prev.notes || []), note] } : prev);
                }
              }

              alert(`✅ ノート生成完了\n\nタイトル: ${res.note?.title || '不明'}`);
            }
          }}
        />

        {/* Note Detail Overlay */}
        {selectedNote && (
          <div className={styles.modalOverlay} onClick={() => setSelectedNote(null)}>
            <div className={`${styles.modalContent} ${styles.noteDetail}`} onClick={e => e.stopPropagation()}>
              <button className={styles.closeButton} onClick={() => setSelectedNote(null)}>&times;</button>
              <div className={styles.noteDetailContent}>
                <header>
                  <span
                    className={styles.tag}
                    style={{
                      backgroundImage: getNoteGradient(selectedNote),
                      color: '#fff',
                    }}
                  >
                    {selectedSubject?.name}
                  </span>
                  <h1>{selectedNote.title}</h1>
                  <time>{new Date(selectedNote.createdAt).toLocaleString()}</time>
                </header>
                <div className={styles.markdownBody}>
                  <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', marginTop: '1.5rem' }}>
                    {selectedNote.content}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
