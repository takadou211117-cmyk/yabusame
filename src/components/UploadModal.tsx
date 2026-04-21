"use client";

import React, { useState, useRef } from 'react';
import styles from './UploadModal.module.css';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'timetable' | 'board';
  onUploadSuccess?: (data: any) => void;
}

export default function UploadModal({ isOpen, onClose, type, onUploadSuccess }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusText, setStatusText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const titles = {
    timetable: '時間割をアップロード',
    board: '黒板の写真をアップロード'
  };

  const descriptions = {
    timetable: '時間割の画像を読み込み、科目を自動登録します。',
    board: '黒板の画像からAIが高品質な学習ノートを自動生成します。'
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    setIsUploading(true);
    setStatusText('画像を解析中... (AIが処理しています)');

    try {
      // 実際はAPIルートに画像を送信します
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await fetch(`/api/${type}`, { 
        method: 'POST', 
        body: formData 
      });
      
      if (!res.ok) {
        throw new Error('APIリクエストに失敗しました');
      }

      const data = await res.json();
      
      if (onUploadSuccess) onUploadSuccess({ success: true, file, data });
      onClose();
    } catch (error) {
      console.error(error);
      alert('アップロードに失敗しました');
    } finally {
      setIsUploading(false);
      setStatusText('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>&times;</button>
        
        <div className={styles.modalHeader}>
          <h2>{titles[type]}</h2>
          <p>{descriptions[type]}</p>
        </div>

        {isUploading ? (
          <div className={styles.uploadingState}>
            <div className={styles.spinner}></div>
            <p>{statusText}</p>
          </div>
        ) : (
          <div 
            className={`${styles.dropzone} ${isDragging ? styles.dropzoneActive : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className={styles.uploadIcon}>📸</div>
            <h3>クリックまたはドラッグ＆ドロップ</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              PNG, JPG, JPEG (最大 10MB)
            </p>
            <input 
              type="file" 
              className={styles.fileInput} 
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
