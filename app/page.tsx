"use client";
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://rajiknrldygtsukhesuf.supabase.co',
  'sb_publishable_i4irAuqZJu1B1W5InAT_eA_8YGB3jyp'
);

export default function LookaApp() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    if (password === "1234") { // 형이 원하는 비번으로 바꿔
      setIsLoggedIn(true);
    } else {
      alert("비밀번호가 틀렸어, 형!");
    }
  };

  return (
    <div style={{ backgroundColor: 'black', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      {!isLoggedIn ? (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: '900', color: '#EAB308', marginBottom: '1rem' }}>LOOKA</h1>
          <p style={{ color: '#9CA3AF', marginBottom: '2rem' }}>10년 차 PD의 스마트 헌팅 앱</p>
          <input 
            type="password" 
            placeholder="비밀번호 입력"
            style={{ backgroundColor: '#1F2937', border: '1px solid #374151', padding: '12px 24px', borderRadius: '999px', width: '250px', textAlign: 'center', color: 'white', marginBottom: '20px' }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <br />
          <button 
            onClick={handleLogin}
            style={{ backgroundColor: '#EAB308', color: 'black', fontWeight: 'bold', padding: '12px 40px', borderRadius: '999px', border: 'none', cursor: 'pointer' }}
          >
            접속하기
          </button>
        </div>
      ) : (
        <div style={{ padding: '40px', width: '100%', maxWidth: '800px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '900', marginBottom: '10px' }}>프로젝트 리스트</h1>
          <p style={{ color: '#EAB308', marginBottom: '40px' }}>성공적으로 로그인했어, 형!</p>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1F2937', padding: '30px', borderRadius: '20px', textAlign: 'center' }}>
            <p style={{ color: '#6B7280' }}>곧 여기에 로케이션들이 뜰 거야. 다음 단계를 진행하자!</p>
          </div>
        </div>
      )}
    </div>
  );
}
