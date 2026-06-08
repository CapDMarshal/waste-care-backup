'use client';

import React, { useState } from 'react';
import { LogOut } from 'lucide-react';
import { logout } from '@/lib/auth';

export default function AdminLogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);
    try {
      const { error } = await logout();
      if (error) {
        alert('Gagal logout. Silakan coba lagi.');
        setLoggingOut(false);
        return;
      }
      
      // Redirect to homepage after successful logout
      window.location.href = '/';
    } catch (error) {
      alert('Gagal logout. Silakan coba lagi.');
      setLoggingOut(false);
    }
  };

  return (
    <button 
      onClick={handleLogout}
      disabled={loggingOut}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-green-700 transition-colors text-green-200 text-left"
    >
      <LogOut size={20} />
      <span className="font-medium">{loggingOut ? 'Keluar...' : 'Keluar'}</span>
    </button>
  );
}
