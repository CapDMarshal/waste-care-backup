'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input } from '@/components';
import { useAuth } from '@/hooks/useAuth';
import type { Database } from '@/types/database.types';
import { createCampaignAction } from './actions';

type OrganizerType = 'personal' | 'organization';
type CampaignInsert = Database['public']['Tables']['campaigns']['Insert'];

interface CampaignFormData {
  title: string;
  date: string;
  time: string;
  maxParticipants: number;
  minParticipants: number;
  description: string;
  organizerType: OrganizerType;
  organizerName: string;
}

export default function CreateCampaignForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const reportId = searchParams.get('reportId');
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  const [formData, setFormData] = useState<CampaignFormData>({
    title: '',
    date: '',
    time: '',
    maxParticipants: 2,
    minParticipants: 0,
    description: '',
    organizerType: 'personal',
    organizerName: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // In admin context, reportId is required but redirect to admin page instead
    if (!reportId) {
      // Not redirecting — admin can access this page directly
      return;
    }

    // Set default organizer name from user
    if (user?.user_metadata?.full_name) {
      setFormData(prev => ({
        ...prev,
        organizerName: user.user_metadata.full_name,
      }));
    } else if (user?.email) {
      setFormData(prev => ({
        ...prev,
        organizerName: user.email?.split('@')[0] || '',
      }));
    }
  }, [reportId, user]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'maxParticipants' || name === 'minParticipants') ? (value === '' ? ('' as any) : parseInt(value)) : value,
    }));
  };

  const handleOrganizerTypeChange = (type: OrganizerType) => {
    setFormData(prev => ({
      ...prev,
      organizerType: type,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    try {
      // Validate form
      if (!formData.title || !formData.date || !formData.time || !formData.organizerName) {
        throw new Error('Mohon lengkapi semua field yang diperlukan');
      }

      if (formData.maxParticipants < 2) {
        throw new Error('Minimal partisipan adalah 2 orang');
      }

      if (!reportId) {
        throw new Error('Report ID diperlukan. Buka halaman ini dari detail laporan.');
      }

      // Combine date and time - parse as local time
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      const startDateTime = new Date(year, month - 1, day, hours, minutes, 0);

      // Validate that campaign is not in the past
      const now = new Date();
      if (startDateTime < now) {
        throw new Error('Waktu campaign tidak boleh di masa lalu');
      }

      // Set end time to 2 hours after start
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 2);

      // Create campaign
      const campaignData: CampaignInsert = {
        title: formData.title,
        description: formData.description || 'Campaign untuk membersihkan sampah',
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        max_participants: formData.maxParticipants,
        min_participants: formData.minParticipants,
        report_id: parseInt(reportId),
        organizer_name: formData.organizerName,
        organizer_type: formData.organizerType,
        status: 'upcoming',
      };

      const result = await createCampaignAction(campaignData as any);
      if (!result.success) {
        throw new Error(result.error || 'Gagal membuat campaign');
      }

      setSuccess(true);
      // Redirect back to admin laporan after success
      setTimeout(() => {
        router.push('/admin/laporan');
      }, 1500);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal membuat campaign';
      console.error('Create campaign error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Buat Campaign</h1>
              <p className="text-sm text-gray-500">Ajak orang untuk bergotong royong</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="px-4 py-6 space-y-6">
        {/* Success Message */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700 font-semibold">✓ Campaign berhasil dibuat! Mengalihkan...</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Report Info */}
        {!reportId && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-700">
              ⚠ Tidak ada Report ID. Untuk membuat campaign, buka halaman ini dari detail laporan yang disetujui dengan parameter <code>?reportId=ID</code>.
            </p>
          </div>
        )}

        {/* Lokasi Campaign Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-blue-600 mb-1">Lokasi Campaign</h2>
              <p className="text-sm text-blue-600">
                {reportId ? `Berdasarkan Laporan #${reportId}` : 'Lokasi dari laporan yang dipilih'}
              </p>
              {lat && lng && (
                <p className="text-xs text-gray-500 mt-1">
                  Koordinat: {parseFloat(lat).toFixed(5)}, {parseFloat(lng).toFixed(5)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Detail Campaign Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Detail Campaign</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Judul Campaign <span className="text-red-500">*</span>
            </label>
            <Input
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="Contoh: Gerakan Bersih-bersih Sungai Ciliwung"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Tanggal <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Waktu <span className="text-red-500">*</span>
              </label>
              <Input
                type="time"
                name="time"
                value={formData.time}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Maksimal Partisipan <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              name="maxParticipants"
              value={formData.maxParticipants}
              onChange={handleInputChange}
              min={2}
              required
            />
            <p className="text-xs text-gray-500 mt-1 mb-4">Minimal 2 orang partisipan</p>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Minimal Partisipan <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              name="minParticipants"
              value={formData.minParticipants}
              onChange={handleInputChange}
              min={0}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Campaign akan dibatalkan otomatis jika target minimal tidak tercapai (0 = tanpa minimal)</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Deskripsi (Opsional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Tambahkan informasi tambahan tentang campaign..."
              rows={4}
              className="w-full px-4 py-3 text-gray-500 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm resize-none"
            />
          </div>
        </div>

        {/* Penyelenggara Section */}
        <div className="bg-white rounded-2xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Penyelenggara</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Tipe Penyelenggara <span className="text-red-500">*</span>
            </label>
            <div className="space-y-3">
              {/* Pribadi */}
              <button
                type="button"
                onClick={() => handleOrganizerTypeChange('personal')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  formData.organizerType === 'personal'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.organizerType === 'personal' ? 'border-emerald-500' : 'border-gray-300'}`}>
                    {formData.organizerType === 'personal' && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${formData.organizerType === 'personal' ? 'text-emerald-700' : 'text-gray-700'}`}>
                      Pribadi
                    </p>
                    <p className="text-sm text-gray-600">Campaign atas nama pribadi</p>
                  </div>
                </div>
              </button>

              {/* Organisasi */}
              <button
                type="button"
                onClick={() => handleOrganizerTypeChange('organization')}
                className={`w-full p-4 rounded-xl border-2 transition-all ${
                  formData.organizerType === 'organization'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${formData.organizerType === 'organization' ? 'border-emerald-500' : 'border-gray-300'}`}>
                    {formData.organizerType === 'organization' && <div className="w-3 h-3 rounded-full bg-emerald-500" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`font-semibold ${formData.organizerType === 'organization' ? 'text-emerald-700' : 'text-gray-700'}`}>
                      Yayasan/Organisasi
                    </p>
                    <p className="text-sm text-gray-600">Campaign atas nama yayasan atau organisasi</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nama Penyelenggara <span className="text-red-500">*</span>
            </label>
            <Input
              name="organizerName"
              value={formData.organizerName}
              onChange={handleInputChange}
              placeholder={formData.organizerType === 'personal' ? 'Al Haytham' : 'Yayasan Peduli Lingkungan'}
              required
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="sticky bottom-0 left-0 right-0 bg-white p-4 -mx-4 shadow-lg">
          <Button
            type="submit"
            fullWidth
            disabled={loading || success || !reportId}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300"
          >
            {loading ? 'Membuat Campaign...' : success ? 'Berhasil!' : 'Buat Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
}
