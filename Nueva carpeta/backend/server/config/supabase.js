"use strict";
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET               = process.env.SUPABASE_BUCKET || "recepcion-archivos";

// En desarrollo local (sin Supabase configurado) usamos disco
const usarSupabase = !!(SUPABASE_URL && SUPABASE_SERVICE_KEY);

let supabase = null;
if (usarSupabase) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}

module.exports = { supabase, BUCKET, usarSupabase };
