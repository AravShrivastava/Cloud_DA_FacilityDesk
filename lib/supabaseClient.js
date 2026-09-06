// Server-side Supabase client — used only inside /api serverless functions.
// Uses the SERVICE ROLE / SECRET key, which bypasses Row Level Security. This
// key must never be exposed to the browser: it is read from an environment
// variable that is only available in the Vercel serverless runtime, and it
// has no NEXT_PUBLIC_ / VITE_ prefix, so it is never bundled into client code.
//
// Initialization is wrapped in try/catch so a missing/invalid env var
// produces a clean, catchable error (surfaced as JSON by the route handlers)
// instead of crashing the function at import time, which is what causes
// Vercel's generic "A server error has occurred" HTML page — the kind of
// response that breaks JSON.parse() on the frontend with an error like
// "Unexpected token 'A', 'A server e'... is not valid JSON".
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;
let initError = null;

try {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable(s). ' +
      'Set them under Vercel Project Settings -> Environment Variables (Production), ' +
      'then redeploy — env var changes do not apply to existing deployments.'
    );
  }
  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} catch (err) {
  initError = err;
}

module.exports = { supabase, initError };
