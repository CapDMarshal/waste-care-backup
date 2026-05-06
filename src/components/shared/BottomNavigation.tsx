'use client';

import React from 'react';
import { usePathname } from 'next/navigation';

export const BottomNavigation: React.FC = () => {
  const pathname = usePathname();

  const navItems = [
    {
      href: '/dashboard',
      label: 'Beranda',
      icon: (active: boolean) => (
        <img 
          src="/icons/homeicon.svg" 
          alt="Home" 
          className="w-full h-full"
          style={{
            filter: active 
              ? 'brightness(0) saturate(100%) invert(41%) sepia(58%) saturate(3656%) hue-rotate(143deg) brightness(103%) contrast(101%)' // emerald-500
              : 'brightness(0) saturate(100%) invert(60%) sepia(8%) saturate(567%) hue-rotate(169deg) brightness(95%) contrast(92%)' // slate-400
          }}
        />
      )
    },
    {
      href: '/campaign',
      label: 'Campaign',
      icon: (active: boolean) => (
        <svg className={`w-full h-full ${active ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      href: '/notifikasi',
      label: 'Notifikasi',
      icon: (active: boolean) => (
        <svg className={`w-full h-full ${active ? 'text-emerald-500' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    {
      href: '/lapor',
      label: 'Lapor',
      icon: (active: boolean) => (
        <img 
          src="/icons/laporicon.svg" 
          alt="Lapor" 
          className="w-full h-full"
          style={{
            filter: active 
              ? 'brightness(0) saturate(100%) invert(41%) sepia(58%) saturate(3656%) hue-rotate(143deg) brightness(103%) contrast(101%)' // emerald-500
              : 'brightness(0) saturate(100%) invert(60%) sepia(8%) saturate(567%) hue-rotate(169deg) brightness(95%) contrast(92%)' // slate-400
          }}
        />
      )
    },
    {
      href: '/akun',
      label: 'Akun',
      icon: (active: boolean) => (
        <img 
          src="/icons/accounticon.svg" 
          alt="Account" 
          className="w-full h-full"
          style={{
            filter: active 
              ? 'brightness(0) saturate(100%) invert(41%) sepia(58%) saturate(3656%) hue-rotate(143deg) brightness(103%) contrast(101%)' // emerald-500
              : 'brightness(0) saturate(100%) invert(60%) sepia(8%) saturate(567%) hue-rotate(169deg) brightness(95%) contrast(92%)' // slate-400
          }}
        />
      )
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex items-center justify-around py-2 px-1 sm:px-4 pb-safe">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
          
          return (
            <a
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-2 px-1.5 sm:px-3 rounded-lg transition-colors duration-200 flex-1 max-w-[80px] sm:max-w-none ${
                isActive ? 'bg-emerald-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                {item.icon(isActive)}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1 truncate max-w-full ${
                isActive ? 'text-emerald-500 font-medium' : 'text-slate-400'
              }`}>
                {item.label}
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNavigation;