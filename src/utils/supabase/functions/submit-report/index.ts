// ============================================================
// submit-report  —  Supabase Edge Function
// ============================================================
// POST /functions/v1/submit-report
// Authorization: Bearer <user_access_token>
//
// Body (JSON):
//   image_base64       string   JPEG/PNG base64, max 10 MB
//   latitude           number
//   longitude          number
//   notes?             string
//   waste_type?        'organik'|'anorganik'|'campuran'   (AI-generated if omitted)
//   hazard_risk?       'tidak_ada'|'rendah'|'menengah'|'tinggi'  (AI-generated if omitted)
//   waste_volume?      'kurang_dari_30kg'|'30_50kg'|'50_100kg'|'lebih_dari_100kg'
//   location_category? 'sungai'|'pinggir_jalan'|'area_publik'|'tanah_kosong'|'lainnya'
//
// Response:
//   { success, data: { report_id, image_url, validation, created_at } }
// ============================================================

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── CORS ─────────────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Constants ─────────────────────────────────────────────────
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const GEMINI_MODEL = 'gemini-2.5-flash';

// ── Valid enum values ─────────────────────────────────────────
const VALID_WASTE_TYPES = ['organik', 'anorganik', 'campuran'] as const;
const VALID_HAZARD_RISKS = ['tidak_ada', 'rendah', 'menengah', 'tinggi'] as const;
const VALID_WASTE_VOLUMES = ['kurang_dari_30kg', '30_50kg', '50_100kg', 'lebih_dari_100kg'] as const;
const VALID_LOCATION_CATS = ['sungai', 'pinggir_jalan', 'area_publik', 'tanah_kosong', 'lainnya'] as const;

type WasteType = typeof VALID_WASTE_TYPES[number];
type HazardRisk = typeof VALID_HAZARD_RISKS[number];
type WasteVolume = typeof VALID_WASTE_VOLUMES[number];
type LocationCat = typeof VALID_LOCATION_CATS[number];

// ── Gemini AI response shape ──────────────────────────────────
interface GeminiClassification {
  is_waste: boolean;
  confidence: 'tinggi' | 'menengah' | 'rendah';
  notes: string;
  waste_type: WasteType;
  hazard_risk: HazardRisk;
  waste_volume: WasteVolume;
  location_category: LocationCat;
}

// ── Helper — JSON response ────────────────────────────────────
function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── Helper — get Vertex AI access token from service account ─────
async function getVertexAIToken(serviceAccountJson: string): Promise<string> {
  const sa = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const payload = btoa(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const signingInput = `${header}.${payload}`;

  // Import the RSA private key from PEM
  const pem = sa.private_key.replace(/-----.*?-----/gs, '').replace(/\s/g, '');
  const keyBytes = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', keyBytes,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false, ['sign']
  );

  const sigBytes = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5', cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBytes)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  const jwt = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const { access_token } = await tokenRes.json();
  if (!access_token) throw new Error('Failed to obtain Vertex AI access token');
  return access_token;
}

function extractJsonObject(rawText: string): string {
  const trimmed = rawText.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  if (unfenced.startsWith('{') && unfenced.endsWith('}')) {
    return unfenced;
  }

  const firstBrace = unfenced.indexOf('{');
  const lastBrace = unfenced.lastIndexOf('}');

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return unfenced.slice(firstBrace, lastBrace + 1).trim();
  }

  return unfenced;
}

function repairJsonText(rawText: string): string {
  return rawText
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

function parseGeminiClassification(rawText: string): GeminiClassification {
  const cleaned = extractJsonObject(rawText);
  const parseCandidates = [cleaned, repairJsonText(cleaned)];
  let parsed: (Partial<GeminiClassification> & { reason?: string }) | undefined;

  for (const candidate of parseCandidates) {
    try {
      parsed = JSON.parse(candidate) as Partial<GeminiClassification> & { reason?: string };
      break;
    } catch {
      continue;
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Vertex AI tidak mengembalikan objek JSON yang valid');
  }

  if (!parsed.notes && parsed.reason) {
    parsed.notes = parsed.reason;
  }

  if (!parsed.notes) {
    parsed.notes = '';
  }

  return parsed as GeminiClassification;
}

// ── Helper — call Vertex AI Vision ───────────────────────────────
async function classifyWithVertexAI(
  imageBase64: string,
  mimeType: string,
  serviceAccountJson: string,
  projectId: string,
  location = 'us-central1',
): Promise<GeminiClassification> {
  const prompt = `
You are a waste classification AI for WasteCare, an environmental reporting app in Indonesia.

Analyze this image and respond ONLY with a valid JSON object — no markdown, no extra text.

JSON schema:
{
  "is_waste": boolean,           // true if the image clearly contains waste/trash
  "confidence": "tinggi"|"menengah"|"rendah",
  "notes": string,              // 1-2 sentence explanation in Indonesian
  "waste_type": "organik"|"anorganik"|"campuran",  // organic, inorganic, or mixed
  "hazard_risk": "tidak_ada"|"rendah"|"menengah"|"tinggi",  // hazard level
  "waste_volume": "kurang_dari_30kg"|"30_50kg"|"50_100kg"|"lebih_dari_100kg",
  "location_category": "sungai"|"pinggir_jalan"|"area_publik"|"tanah_kosong"|"lainnya"
}

Classification guide:
- waste_type:
    organik   = biodegradable (food waste, leaves, vegetables, etc.)
    anorganik = non-biodegradable (plastic, glass, metal, paper, etc.)
    campuran  = clearly mixed organic and inorganic waste
- hazard_risk:
    tidak_ada = household/common waste, no obvious hazard
    rendah    = minor risk (sharp edges, mild chemicals visible on packaging)
    menengah  = moderate risk (batteries, paint containers, medical packaging)
    tinggi    = high risk (chemical drums, syringes, industrial waste, biohazard)
- waste_volume: (NOTE: Estimate by WEIGHT, not just surface area. Scattered light plastics take up space but are very light)
    kurang_dari_30kg = Small amount or scattered street litter. Even if scattered over a wide area, light plastics/wrappers are < 30kg. (e.g., 1-3 regular household trash bags)
    30_50kg          = Medium amount. A dense, concentrated pile of heavy waste, or 4-6 large filled trash bags.
    50_100kg         = Large amount. An overflowing large dumpster, or a heavy pile of mixed waste (wood, dirt, many bags).
    lebih_dari_100kg = Massive amount. Illegal dumping ground blocking a path, full pickup truck load of dense waste.
- If is_waste is false, still return valid enum values as defaults but set confidence to "rendah".
`.trim();

  const accessToken = await getVertexAIToken(serviceAccountJson);
  const endpoint = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${GEMINI_MODEL}:generateContent`;

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
        ],
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Vertex AI error ${res.status}: ${err.slice(0, 200)}`);
  }

  const vertexData = await res.json();
  const rawText: string =
    vertexData?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

  if (!rawText) throw new Error('Vertex AI mengembalikan respons kosong');
  if (rawText.length > 4000) throw new Error('AI_RESPONSE_TOO_LONG');

  let parsed: GeminiClassification;
  try {
    parsed = parseGeminiClassification(rawText);
  } catch {
    const preview = rawText.trim().slice(0, 200).replace(/\s+/g, ' ');
    throw new Error(`Vertex AI tidak mengembalikan JSON yang valid${preview ? `: ${preview}` : ''}`);
  }

  // Sanitise/default any out-of-range values
  if (!VALID_WASTE_TYPES.includes(parsed.waste_type)) parsed.waste_type = 'campuran';
  if (!VALID_HAZARD_RISKS.includes(parsed.hazard_risk)) parsed.hazard_risk = 'tidak_ada';
  if (!VALID_WASTE_VOLUMES.includes(parsed.waste_volume)) parsed.waste_volume = 'kurang_dari_30kg';
  if (!VALID_LOCATION_CATS.includes(parsed.location_category)) parsed.location_category = 'lainnya';

  return parsed;
}

// ── Main handler ──────────────────────────────────────────────
serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ success: false, error: 'Method not allowed' }, 405);
  }

  // ── Env vars ─────────────────────────────────────────────
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const SERVICE_ACCOUNT_JSON = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');
  const GCP_PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID');

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ success: false, error: 'Server configuration error' }, 500);
  }
  if (!SERVICE_ACCOUNT_JSON || !GCP_PROJECT_ID) {
    return json({ success: false, error: 'AI service not configured (missing GCP credentials)' }, 500);
  }

  // ── Authenticate user ─────────────────────────────────────
  const authHeader = req.headers.get('Authorization') ?? '';
  const accessToken = authHeader.replace(/^Bearer\s+/i, '');

  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: { user }, error: authError } = await userClient.auth.getUser(accessToken);
  if (authError || !user) {
    return json({ success: false, error: 'Sesi tidak valid. Silakan login kembali.' }, 401);
  }

  // ── Parse request body ────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ success: false, error: 'Request body tidak valid' }, 400);
  }

  const {
    image_base64,
    latitude,
    longitude,
    notes = '',
    waste_type: overrideWasteType,
    hazard_risk: overrideHazardRisk,
    waste_volume: overrideWasteVolume,
    location_category: overrideLocationCat,
  } = body as {
    image_base64?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
    waste_type?: string;
    hazard_risk?: string;
    waste_volume?: string;
    location_category?: string;
  };

  // ── Validate required fields ──────────────────────────────
  if (!image_base64 || typeof image_base64 !== 'string') {
    return json({ success: false, error: 'Gambar diperlukan' }, 400);
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return json({ success: false, error: 'Koordinat GPS diperlukan' }, 400);
  }

  // ── Image size check ──────────────────────────────────────
  const imageBytes = Math.ceil(image_base64.length * 0.75);
  if (imageBytes > MAX_IMAGE_BYTES) {
    return json({
      success: false,
      error: `Ukuran gambar terlalu besar (${Math.round(imageBytes / 1024 / 1024)}MB). Maksimal 10MB.`,
    }, 400);
  }

  // ── Detect MIME type from base64 header ───────────────────
  let mimeType = 'image/jpeg';
  if (image_base64.startsWith('/9j/') || image_base64.includes('data:image/jpeg')) {
    mimeType = 'image/jpeg';
  } else if (image_base64.startsWith('iVBORw0KGgo') || image_base64.includes('data:image/png')) {
    mimeType = 'image/png';
  } else if (image_base64.startsWith('UklGR') || image_base64.includes('data:image/webp')) {
    mimeType = 'image/webp';
  }

  // Strip any data URL prefix if present
  const cleanBase64 = image_base64.replace(/^data:image\/[a-z]+;base64,/, '');

  // ── Vertex AI classification ──────────────────────────────
  let aiResult: GeminiClassification;
  try {
    aiResult = await classifyWithVertexAI(cleanBase64, mimeType, SERVICE_ACCOUNT_JSON, GCP_PROJECT_ID);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ success: false, error: `Gagal memvalidasi gambar: ${msg}` }, 422);
  }

  // If AI says this is not waste, reject
  if (!aiResult.is_waste && aiResult.confidence === 'tinggi') {
    return json({
      success: false,
      error: 'Gambar tidak terdeteksi sebagai sampah. Pastikan gambar menampilkan lokasi sampah dengan jelas.',
      validation: {
        isWaste: false,
        confidence: aiResult.confidence,
        notes: aiResult.notes,
      },
    }, 422);
  }

  // Merge AI output with any client-side overrides
  const finalWasteType: WasteType = (VALID_WASTE_TYPES.includes(overrideWasteType as WasteType)
    ? overrideWasteType : aiResult.waste_type) as WasteType;
  const finalHazardRisk: HazardRisk = (VALID_HAZARD_RISKS.includes(overrideHazardRisk as HazardRisk)
    ? overrideHazardRisk : aiResult.hazard_risk) as HazardRisk;
  const finalVolume: WasteVolume = (VALID_WASTE_VOLUMES.includes(overrideWasteVolume as WasteVolume)
    ? overrideWasteVolume : aiResult.waste_volume) as WasteVolume;
  const finalLocation: LocationCat = (VALID_LOCATION_CATS.includes(overrideLocationCat as LocationCat)
    ? overrideLocationCat : aiResult.location_category) as LocationCat;
  const finalNotes = ((notes as string) || '').trim() || aiResult.notes;

  // ── Upload image to Storage ───────────────────────────────
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const timestamp = Date.now();
  const storagePath = `${user.id}/${timestamp}.jpg`;

  const imageBuffer = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));

  const { error: uploadError } = await adminClient
    .storage
    .from('report-images')
    .upload(storagePath, imageBuffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return json({
      success: false,
      error: `Gagal mengunggah gambar: ${uploadError.message}`,
    }, 500);
  }

  // Get public URL
  const { data: { publicUrl } } = adminClient
    .storage
    .from('report-images')
    .getPublicUrl(storagePath);

  // ── Insert report into database ───────────────────────────
  // Using raw SQL via rpc to insert PostGIS POINT
  const { data: insertData, error: insertError } = await adminClient
    .rpc('insert_report_with_location', {
      p_user_id: user.id,
      p_image_urls: [publicUrl],
      p_waste_type: finalWasteType,
      p_hazard_risk: finalHazardRisk,
      p_waste_volume: finalVolume,
      p_location_category: finalLocation,
      p_notes: finalNotes || null,
      p_latitude: latitude,
      p_longitude: longitude,
    });

  if (insertError) {
    // Clean up uploaded image on DB failure
    await adminClient.storage.from('report-images').remove([storagePath]);
    console.error('DB insert error:', insertError);
    return json({
      success: false,
      error: `Gagal menyimpan laporan: ${insertError.message}`,
    }, 500);
  }

  const report = Array.isArray(insertData) ? insertData[0] : insertData;

  // Insert notification for the user
  const { error: notifError } = await adminClient.from('notifications').insert({
    user_id: user.id,
    title: 'Laporan Berhasil Dibuat',
    message: 'Laporan Anda berhasil dikirim dan sedang menunggu tinjauan admin.',
    type: 'report_status',
    related_id: report.id
  });
  
  if (notifError) {
    console.error('Failed to create notification:', notifError);
    // Non-blocking error, we still return success for the report
  }

  // ── Return success ────────────────────────────────────────
  return json({
    success: true,
    data: {
      report_id: report.id,
      image_url: publicUrl,
      validation: {
        isWaste: aiResult.is_waste,
        confidence: aiResult.confidence,
        notes: finalNotes,
        waste_type: finalWasteType,
        hazard_risk: finalHazardRisk,
        waste_volume: finalVolume,
        location_category: finalLocation,
      },
      created_at: report.created_at,
    },
  });
});
