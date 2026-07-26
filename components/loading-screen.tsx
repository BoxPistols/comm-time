"use client";

import React from "react";

export function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #eef2ff, #faf5ff, #fdf2f8)',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        {/* タイマー風ローディングアニメーション */}
        <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 24px' }}>
          <svg
            width="96"
            height="96"
            viewBox="0 0 100 100"
            style={{ transform: 'rotate(-90deg)' }}
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="url(#loadingGradient)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="283"
              strokeDashoffset="70"
              style={{
                animation: 'spin 2s linear infinite',
                transformOrigin: 'center',
              }}
            />
            <defs>
              <linearGradient id="loadingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="50%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
          </svg>
          {/* 中央のタイマーアイコン（インラインSVG） */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ animation: 'pulse 2s ease-in-out infinite' }}
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>
        {/* アプリ名 */}
        <h1
          style={{
            fontSize: 24,
            fontWeight: 'bold',
            background: 'linear-gradient(to right, #6366f1, #a855f7, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 8,
          }}
        >
          Comm Time
        </h1>
        {/* ローディングテキスト */}
        <p style={{ color: '#6b7280', fontSize: 14 }}>Loading...</p>
      </div>
      {/* アニメーション用のstyleタグ */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
