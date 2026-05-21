# 🌍 WasteCare v2

WasteCare adalah sebuah platform berbasis komunitas dan pemerintah (DLHK) yang dirancang untuk mengatasi masalah sampah liar melalui partisipasi publik. Pengguna dapat melaporkan titik tumpukan sampah, dan sistem (yang didukung oleh AI) akan mengklasifikasikannya. Administrator kemudian dapat mengubah laporan yang tervalidasi menjadi sebuah **Campaign Kebersihan (Gotong Royong)** yang bisa diikuti oleh masyarakat luas.

## ✨ Fitur Utama

### Untuk Pengguna (Masyarakat)
- **📍 Pelaporan Sampah Interaktif:** Laporkan titik sampah langsung dari peta beserta foto kondisi di lapangan.
- **🤖 AI Waste Classification:** Terintegrasi dengan Google Cloud Vertex AI (Gemini 2.5 Flash) untuk mengklasifikasi jenis sampah (organik, anorganik, campuran) dan estimasi volume secara otomatis dari foto laporan.
- **🗺️ Eksplorasi Peta (Map View):** Lihat titik-titik sampah di sekitarmu yang belum dibersihkan beserta rute menuju lokasi.
- **🤝 Ikut Campaign (Gotong Royong):** Daftar dan jadilah relawan pada campaign pembersihan yang diselenggarakan oleh DLHK atau komunitas.
- **🔔 Notifikasi Otomatis:** Dapatkan notifikasi pengingat via sistem (H-24 jam, H-12 jam) sebelum campaign dimulai.

### Untuk Administrator (DLHK/Komunitas)
- **📋 Verifikasi Laporan:** Tinjau dan validasi laporan sampah dari masyarakat (Setujui, Tolak, atau tandai sebagai Berbahaya).
- **📅 Manajemen Campaign:** Buat *Campaign* kebersihan baru berdasarkan titik laporan yang disetujui.
- **👥 Kelola Peserta:** Pantau siapa saja yang mendaftar dan kelola daftar hadir/absensi pada hari H (Hadir / Tidak Hadir).
- **📊 Dashboard Statistik:** Visualisasi data sebaran jenis sampah dan tingkat partisipasi di berbagai wilayah.
- **⚙️ Pembatalan Otomatis:** Sistem *Cron Job* pintar yang akan membatalkan campaign secara otomatis jika kuota minimal peserta tidak terpenuhi dalam waktu 24 jam sebelum acara dimulai.

## 🛠️ Tech Stack

- **Framework:** [Next.js 15 (App Router)](https://nextjs.org/)
- **Bahasa:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL + RLS Policies)
- **AI Integration:** Google Cloud Vertex AI
- **Peta & Geolocation:** Leaflet / React-Leaflet
- **Cron Jobs:** Eksternal trigger via cron-job.org ke API Route Next.js.

## 🚀 Panduan Instalasi Lokal

1. **Clone repositori ini**
   ```bash
   git clone https://github.com/username/waste-care-v2.git
   cd waste-care-v2
   ```

2. **Install dependensi**
   ```bash
   npm install
   # atau
   yarn install
   # atau
   bun install
   ```

3. **Konfigurasi Environment Variables**
   Buat file `.env.local` di *root directory* dan isi dengan parameter dari Supabase dan Vertex AI Anda:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   CRON_SECRET=your_secret_string_for_cron_auth
   
   # Google Cloud Vertex AI Credentials
   GCP_PROJECT_ID=your_gcp_project_id
   GCP_CLIENT_EMAIL=your_gcp_client_email
   GCP_PRIVATE_KEY="your_gcp_private_key"
   ```

4. **Jalankan Development Server**
   ```bash
   npm run dev
   # atau
   bun dev
   ```

5. **Buka Aplikasi**
   Kunjungi [http://localhost:3000](http://localhost:3000) di browser Anda.

## 📂 Struktur Proyek

- `src/app`: Berisi struktur halaman (Routing) Next.js App Router (termasuk dashboard admin dan tampilan user).
- `src/components`: Komponen UI yang dapat digunakan kembali (*reusable*).
- `src/hooks`: Custom React Hooks untuk integrasi API dan state management.
- `src/lib` & `src/utils`: Fungsi *helper*, integrasi layanan eksternal, dan utilitas database.
- `src/types`: Definisi tipe data statis TypeScript, termasuk skema Supabase (`database.types.ts`).
- `docs/`: Dokumentasi tambahan seperti alur kerja model AI (`vertex-ai-flow.md`).

## 📜 Lisensi

Proyek ini dibangun untuk tujuan edukasi dan lingkungan. Silakan baca file [LICENSE](LICENSE) (jika ada) untuk informasi lebih lanjut mengenai ketentuan penggunaan.
