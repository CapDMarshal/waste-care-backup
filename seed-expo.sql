DO $$
DECLARE
  v_admin_id uuid;
  v_report1_id bigint;
  v_report2_id bigint;
  v_report3_id bigint;
BEGIN
  -- Dapatkan ID user yang ada (pastikan sudah register 1 user di web)
  SELECT id INTO v_admin_id FROM public.profiles LIMIT 1;
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Belum ada user. Buka web (localhost:3000) dan register 1 akun dulu!';
  END IF;

  -- Jadikan user tersebut admin secara otomatis
  UPDATE public.profiles SET role = 'admin' WHERE id = v_admin_id;
  UPDATE auth.users SET raw_app_meta_data = '{"role": "admin"}'::jsonb WHERE id = v_admin_id;

  -- Insert 3 Dummy Reports (Approved, Pending, Hazardous)
  
  -- Laporan 1: Approved (Agar masuk ke Map/Peta) - Depok, Sleman (Area UGM)
  INSERT INTO public.reports (user_id, image_urls, waste_type, waste_volume, location_category, hazard_risk, notes, status, location)
  VALUES (
    v_admin_id, 
    ARRAY['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80'], 
    'anorganik', '1_pickup', 'pinggir_jalan', 'rendah', 
    'Tumpukan plastik menumpuk di pinggir trotoar area Kaliurang bawah.', 'approved', 
    ST_SetSRID(ST_MakePoint(110.3775, -7.7669), 4326)::geography
  ) RETURNING id INTO v_report1_id;

  -- Laporan 2: Pending (Agar muncul di Dashboard Admin) - Ngaglik, Sleman
  INSERT INTO public.reports (user_id, image_urls, waste_type, waste_volume, location_category, hazard_risk, notes, status, location)
  VALUES (
    v_admin_id, 
    ARRAY['https://images.unsplash.com/photo-1528323273322-d81458248d40?auto=format&fit=crop&q=80'], 
    'organik', '1_truk_kecil', 'sungai', 'menengah', 
    'Sampah organik bambu dan sisa makanan menyumbat aliran sungai pelan di Ngaglik.', 'pending', 
    ST_SetSRID(ST_MakePoint(110.3956, -7.7288), 4326)::geography
  ) RETURNING id INTO v_report2_id;

  -- Laporan 3: Hazardous (B3) - Maguwoharjo, Sleman
  INSERT INTO public.reports (user_id, image_urls, waste_type, waste_volume, location_category, hazard_risk, notes, status, location)
  VALUES (
    v_admin_id, 
    ARRAY['https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?auto=format&fit=crop&q=80'], 
    'campuran', '1_truk_besar', 'tanah_kosong', 'tinggi', 
    'Banyak kaleng cat bekas dan cairan kimia dibuang sembarangan di lahan kosong Maguwo.', 'hazardous', 
    ST_SetSRID(ST_MakePoint(110.4267, -7.7601), 4326)::geography
  ) RETURNING id INTO v_report3_id;

  -- Insert 1 Dummy Campaign (Terkait dengan Laporan 1)
  INSERT INTO public.campaigns (title, description, start_time, end_time, max_participants, min_participants, status, report_id, organizer_name, organizer_type)
  VALUES (
    'Aksi Bersih Area Kaliurang Bawah', 
    'Mari bergabung bersama komunitas mahasiswa untuk membersihkan trotoar jalan Kaliurang dari tumpukan sampah plastik.', 
    now() - interval '2 days', 
    now() - interval '1 day', 
    50, 5, 'finished', v_report1_id, 
    'Mahasiswa Peduli Sleman', 'organization'
  );

END $$;
