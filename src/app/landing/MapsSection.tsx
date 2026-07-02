'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  getReportsForMap,
  type MapReport
} from '@/lib/provinceService';
import {
  fetchWasteTypeStatistics,
  type WasteTypeStatistics
} from '@/lib/statisticsService';

// Dynamically import MapTilerMap to avoid SSR issues
const MapTilerMap = dynamic(
  () => import('@/components/shared/MapTilerMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat peta...</p>
        </div>
      </div>
    )
  }
);

export default function MapsSection() {
  const [reports, setReports] = useState<MapReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WasteTypeStatistics>({
    total: 0,
    organic: 0,
    inorganic: 0,
    hazardous: 0,
    mixed: 0,
    riskNone: 0,
    riskLow: 0,
    riskMedium: 0,
    riskHigh: 0
  });

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fetch reports for map display and statistics in parallel
        const [reportsData, wasteStats] = await Promise.all([
          getReportsForMap(100),
          fetchWasteTypeStatistics()
        ]);

        if (isMounted) {
          setReports(reportsData);
          setStats(wasteStats);
        }
      } catch (error) {
        console.error("Gagal memuat data MapsSection:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []); // Empty dependency array - only run once

  const getWasteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'organik': 'Sampah Organik',
      'anorganik': 'Sampah Anorganik',
      'berbahaya': 'Sampah Berbahaya',
      'campuran': 'Sampah Campuran'
    };
    return labels[type] || type;
  };

  const getLocationLabel = (location: string) => {
    const labels: Record<string, string> = {
      'sungai': 'Sungai',
      'pinggir_jalan': 'Pinggir Jalan',
      'area_public': 'Area Publik',
      'tanah_kosong': 'Tanah Kosong',
      'lainnya': 'Lainnya'
    };
    return labels[location] || location;
  };

  // Memoize markers to prevent unnecessary re-calculations
  const markers = useMemo(() => {
    if (reports.length === 0) return [];
    return reports.map(report => ({
      id: report.id.toString(),
      coordinates: [report.longitude, report.latitude] as [number, number],
      type: 'waste' as const,
      title: getWasteTypeLabel(report.waste_type),
      location: getLocationLabel(report.location_category)
    }));
  }, [reports]);

  // Memoize empty marker click handler to prevent re-render
  const handleMarkerClick = useCallback(() => {
    // Empty function for landing page - just display markers
  }, []);

  return (
    <section id="maps" className="py-20 bg-gray-50">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Peta Sebaran Sampah
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Lihat persebaran titik sampah yang telah dilaporkan oleh pengguna WasteCare di seluruh Indonesia
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">{stats.total}</div>
              <div className="text-sm text-gray-600">Total Laporan</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-600 mb-1">{stats.organic}</div>
              <div className="text-sm text-gray-600">Organik</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">{stats.inorganic}</div>
              <div className="text-sm text-gray-600">Anorganik</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-1">{stats.hazardous}</div>
              <div className="text-sm text-gray-600">Berbahaya</div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">{stats.mixed}</div>
              <div className="text-sm text-gray-600">Campuran</div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {loading ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                <p className="text-gray-600">Memuat peta...</p>
              </div>
            </div>
          ) : reports.length === 0 ? (
            <div className="h-[600px] flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-600">Tidak ada data laporan untuk ditampilkan</p>
              </div>
            </div>
          ) : (
            <div className="h-[600px]">
              <MapTilerMap
                key="landing-map"
                markers={markers}
                onMarkerClick={handleMarkerClick}
              />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="font-semibold text-blue-900 mb-1 text-base">Informasi Peta</h3>
              <p className="text-sm text-blue-800">
                Setiap marker pada peta menunjukkan lokasi yang telah dilaporkan memiliki masalah sampah.
                Klik pada marker untuk melihat detail laporan. Bergabunglah dengan WasteCare untuk melaporkan
                dan membantu membersihkan lingkungan di sekitar Anda.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}