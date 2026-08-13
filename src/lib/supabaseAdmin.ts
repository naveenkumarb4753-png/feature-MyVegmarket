import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
// TEMP DEBUG (remove after fixed)
(async () => {
  try {
    const res = await fetch(`${url}/rest/v1/`, { method: "GET" });
    console.log("Supabase REST ping status:", res.status);
  } catch (e) {
    console.error("Supabase REST ping failed:", e);
  }
})();