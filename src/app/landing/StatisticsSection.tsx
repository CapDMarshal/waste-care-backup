'use client';

import React, { useEffect, useState, memo } from 'react';
import {
  fetchOverallStatistics,
  fetchWasteTypeStatistics,
  type OverallStatistics,
  type WasteTypeStatistics
} from '@/lib/statisticsService';

// Cache for statistics to avoid repeated API calls
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const statisticsCache: {
  overall?: { data: OverallStatistics, timestamp: number },
  waste?: { data: WasteTypeStatistics, timestamp: number }
} = {};

function StatisticsSection() {
  const [overallStats, setOverallStats] = useState<OverallStatistics>({
    totalCampaignsCompleted: 0,
    totalParticipants: 0,
    totalCleanedAreas: 0,
  });
  const [wasteStats, setWasteStats] = useState<WasteTypeStatistics>({
    total: 0,
    organic: 0,
    inorganic: 0,
    hazardous: 0,
    mixed: 0,
    riskNone: 0,
    riskLow: 0,
    riskMedium: 0,
    riskHigh: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_DURATION;
  };

  const loadStatistics = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check cache first
      const now = Date.now();
      const overallFromCache = statisticsCache.overall && isCacheValid(statisticsCache.overall.timestamp);
      const wasteFromCache = statisticsCache.waste && isCacheValid(statisticsCache.waste.timestamp);

      // Use cache if available, otherwise fetch
      const [stats, waste] = await Promise.all([
        overallFromCache ? Promise.resolve(statisticsCache.overall!.data) : fetchOverallStatistics(),
        wasteFromCache ? Promise.resolve(statisticsCache.waste!.data) : fetchWasteTypeStatistics(),
      ]);

      // Update cache
      if (!overallFromCache) {
        statisticsCache.overall = { data: stats, timestamp: now };
      }
      if (!wasteFromCache) {
        statisticsCache.waste = { data: waste, timestamp: now };
      }

      setOverallStats(stats);
      setWasteStats(waste);
    } catch (err) {
      setError('Gagal memuat statistik. Silakan refresh halaman.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-br from-yellow-400 to-yellow-600';
      case 2:
        return 'bg-gradient-to-br from-gray-300 to-gray-500';
      case 3:
        return 'bg-gradient-to-br from-orange-400 to-orange-600';
      default:
        return 'bg-gradient-to-br from-emerald-400 to-emerald-600';
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return (
        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <section id="statistics" className="py-20 bg-white">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Data Statistik WasteCare
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Statistik aksi masyarakat dalam menjaga kebersihan lingkungan
          </p>
        </div>

        {/* Top Cities Leaderboard */}
        <div className="max-w-5xl mx-auto">

          {/* Waste Type Statistics */}
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-8 border border-blue-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
                  <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
                  <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Statistik Jenis Sampah</h3>
                <p className="text-gray-600">Total laporan berdasarkan kategori sampah</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">
                    {loading ? (
                      <div className="animate-pulse h-9 w-16 bg-gray-200 rounded mx-auto"></div>
                    ) : (
                      wasteStats.total.toLocaleString('id-ID')
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Total Laporan</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-600 mb-1">
                    {loading ? (
                      <div className="animate-pulse h-9 w-16 bg-gray-200 rounded mx-auto"></div>
                    ) : (
                      wasteStats.organic.toLocaleString('id-ID')
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Organik</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {loading ? (
                      <div className="animate-pulse h-9 w-16 bg-gray-200 rounded mx-auto"></div>
                    ) : (
                      wasteStats.inorganic.toLocaleString('id-ID')
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Anorganik</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-1">
                    {loading ? (
                      <div className="animate-pulse h-9 w-16 bg-gray-200 rounded mx-auto"></div>
                    ) : (
                      wasteStats.hazardous.toLocaleString('id-ID')
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Berbahaya</div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-1">
                    {loading ? (
                      <div className="animate-pulse h-9 w-16 bg-gray-200 rounded mx-auto"></div>
                    ) : (
                      wasteStats.mixed.toLocaleString('id-ID')
                    )}
                  </div>
                  <div className="text-sm text-gray-600">Campuran</div>
                </div>
              </div>
            </div>
          </div>

          {/* Info
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-yellow-900 mb-1">Cara Perhitungan Skor</h4>
                <p className="text-sm text-yellow-800">
                  Skor dihitung berdasarkan jumlah campaign yang diselesaikan (60%), jumlah laporan yang ditangani (30%),
                  dan campaign aktif (10%). Kota ditentukan berdasarkan koordinat geografis laporan.
                  Data diperbarui secara real-time berdasarkan aktivitas di database.
                </p>
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
}

export default memo(StatisticsSection);
