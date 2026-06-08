'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BottomNavigation, Button } from '@/components';
import { logout } from '@/lib/auth';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function AkunPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [userExp, setUserExp] = useState(0);
  const [loadingExp, setLoadingExp] = useState(true);

  useEffect(() => {
    const fetchUserExp = async () => {
      if (!user?.id) {
        setLoadingExp(false);
        return;
      }

      setLoadingExp(true);
      try {
        const { data } = await supabase
          .from('profiles')
          .select('exp')
          .eq('id', user.id)
          .maybeSingle();

        setUserExp(data?.exp ?? 0);
      } catch (error) {
        setUserExp(0);
      } finally {
        setLoadingExp(false);
      }
    };

    fetchUserExp();
  }, [user?.id]);

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

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return name.substring(0, 2).toUpperCase();
    }

    if (email) {
      return email.substring(0, 2).toUpperCase();
    }

    return 'U';
  };

  const getDisplayName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  if (loading || !user) {
    return null;
  }

  const displayName = getDisplayName();
  const initials = getInitials(user.user_metadata?.full_name, user.email || '');

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Akun</h1>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-[#16a34a] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl text-white font-semibold">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">{displayName}</h2>
              <p className="text-gray-600 truncate text-sm">{user.email || 'No email'}</p>
              <div className="flex items-center space-x-1 mt-2">
                <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-sm font-semibold text-gray-900">{loadingExp ? '...' : userExp.toLocaleString()}</span>
                <span className="text-xs text-gray-500">EXP</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4">
        <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <button
            onClick={() => router.push('/akun/edit-profile')}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="font-medium text-gray-900">Edit Profile</span>
            </div>
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <div className="border-t border-gray-100">
            <button
              onClick={() => router.push('/akun/riwayat-laporan')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-medium text-gray-900">Riwayat Laporan</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="border-t border-gray-100">
            <button
              onClick={() => router.push('/akun/bantuan')}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium text-gray-900">Bantuan</span>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleLogout}
            loading={loggingOut}
            disabled={loggingOut}
            fullWidth
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            {loggingOut ? 'Keluar...' : 'Keluar'}
          </Button>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
