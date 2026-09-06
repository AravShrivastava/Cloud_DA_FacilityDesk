const { supabase, initError } = require('../../lib/supabaseClient');
const { toApi, toDb } = require('../../lib/mapComplaint');

const REQUIRED_FIELDS = ['title', 'description', 'category', 'location', 'reportedBy'];

module.exports = async function handler(req, res) {
  if (initError) {
    return res.status(500).json({ success: false, message: `Server misconfigured: ${initError.message}` });
  }

  if (req.method === 'GET') {
    return handleList(req, res);
  }
  if (req.method === 'POST') {
    return handleCreate(req, res);
  }
  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
};

async function handleList(req, res) {
  try {
    let query = supabase.from('complaints').select('*').order('created_at', { ascending: false });

    const { status, category } = req.query || {};
    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data, error } = await query;
    if (error) return res.status(500).json({ success: false, message: error.message });

    const mapped = data.map(toApi);
    return res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function handleCreate(req, res) {
  try {
    const body = req.body || {};
    const missing = REQUIRED_FIELDS.filter((f) => !body[f]);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        message: `Missing required field(s): ${missing.join(', ')}`,
      });
    }

    const row = toDb(body);
    const { data, error } = await supabase.from('complaints').insert([row]).select().single();
    if (error) return res.status(400).json({ success: false, message: error.message });

    return res.status(201).json({ success: true, data: toApi(data) });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}
