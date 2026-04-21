"use client";

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';
import UploadModal from '../components/UploadModal';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalType, setModalType] = useState<'timetable' | 'board'>('timetable');
  const [modalOpen, setModalOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', university: '', age: '' });
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [selectedNote, setSelectedNote] = useState<any>(null);
  const [view, setView] = useState<'subjects' | 'notes'>('subjects');

  useEffect(() => {
    fetchUser();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      setUser(data);
      setSubjects(data.subjects || []);
      
      // 選択中の科目を更新（ノート一覧を表示している場合）
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
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>AI Student Assistant 起動中...</p>
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
                    <div 
                      className={styles.subjectColor} 
                      style={{ backgroundColor: subject.color || 'var(--primary)' }}
                    />
                  </div>
                  <div className={styles.subjectMeta}>
                    <span>📄 ノート: {subject.notes?.length || 0}件</span>
                  </div>
                </div>
              ))}
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
                    onClick={() => setSelectedNote(note)}
                  >
                    <div className={styles.noteDate}>{new Date(note.createdAt).toLocaleDateString()}</div>
                    <h3>{note.title}</h3>
                    <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>{note.content.slice(0, 80)}...</p>
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
            fetchUser();
            if (modalType === 'timetable') {
              alert(`✅ 時間割の読み取り完了\n\n科目を新しく登録しました！`);
            } else {
              alert(`✅ ノート生成完了\n\nタイトル: ${res.data?.note?.title || '不明'}`);
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
                  <span className={styles.tag}>{selectedSubject?.name}</span>
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
