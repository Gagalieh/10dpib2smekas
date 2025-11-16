/* ============================================================
   CONFIG.JS — FINAL
   Stabil, aman, dan kompatibel dengan admin.js
   ============================================================ */

/* ------------------------------------------------------------
   1. Import Supabase Client JS versi ESM 
   CDN resmi, cepat, stabil, sangat kompatibel.
   ------------------------------------------------------------ */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

/* ------------------------------------------------------------
   2. Konfigurasi proyek Supabase kamu
   GANTI SESUAI KODEMU SENDIRI
   ------------------------------------------------------------ */
const SUPABASE_URL = "https://fsphwejwigdrlnvowome.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcGh3ZWp3aWdkcmxudm93b21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNzk3NzAsImV4cCI6MjA3ODc1NTc3MH0.cvpNv771euRcdXSSjN9O0WUCVndtihF-_lwinHTe8Ns";

/* ------------------------------------------------------------
   3. Validasi konfigurasi (mencegah error aneh)
   ------------------------------------------------------------ */
function validateConfig() {
  if (!SUPABASE_URL || typeof SUPABASE_URL !== "string") {
    throw new Error("❌ SUPABASE_URL tidak valid.");
  }
  if (!SUPABASE_ANON_KEY || typeof SUPABASE_ANON_KEY !== "string") {
    throw new Error("❌ SUPABASE_ANON_KEY tidak valid.");
  }
}
validateConfig();

/* ------------------------------------------------------------
   4. Buat client Supabase
   ------------------------------------------------------------ */
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      "x-application-name": "27dpib2-admin-dashboard"
    }
  }
});

/* ------------------------------------------------------------
   5. Fallback untuk debugging & Live Server
   Supaya kamu bisa mengetik `supabase` di console tanpa error.
   ------------------------------------------------------------ */
try {
  window.supabase = supabase;   // global akses
  window.$supabase = supabase;  // alias pendek
} catch (err) {
  console.warn("Window context not available (ini normal di environment SSR)");
}

/* ------------------------------------------------------------
   6. Helper untuk cek status login (di console)
   kamu bisa jalankan:
     await supabase.debugSession();
   ------------------------------------------------------------ */
supabase.debugSession = async function () {
  const session = await supabase.auth.getSession();
  console.log("=== SESSION DEBUG ===");
  console.log(JSON.stringify(session, null, 2));
  return session;
};

/* ------------------------------------------------------------
   7. Helper: test upload
   Supaya kamu bisa langsung test lewat console:
     await supabase.testUpload();
   ------------------------------------------------------------ */
supabase.testUpload = async function () {
  const blob = new Blob(["test"], { type: "text/plain" });
  const path = "test_upload_" + Date.now() + ".txt";
  const { data, error } = await supabase.storage
    .from("photos")
    .upload(path, blob);

  console.log("=== TEST UPLOAD RESULT ===");
  console.log({ data, error });
  return { data, error };
};

/* ------------------------------------------------------------
   8. Export ke admin.js
   ------------------------------------------------------------ */
export { supabase };

/* ============================================================
   END OF CONFIG FILE
   ============================================================ */