const { supabase, initError } = require('../../lib/supabaseClient');
const { toApi, toDb } = require('../../lib/mapComplaint');

module.exports = async function handler(req, res) {
  if (initError) {
    return res.status(500).json({ success: false, message: `Server misconfigured: ${initError.message}` });
  }

  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Complaint id is required' });
  }

  if (req.method === 'GET') return handleGet(id, res);
  if (req.method === 'PUT') return handleUpdate(id, req, res);
  if (req.method === 'DELETE') return handleDelete(id, res);

  res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
  return res.status(405).json({ success: false, message: `Method ${req.method} not allowed` });
};

async function handleGet(id, res) {
  try {
    const { data, error } = await supabase.from('complaints').select('*').eq('id', id).maybeSingle();
    if (error) return res.status(400).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Complaint not found' });
    return res.status(200).json({ success: true, data: toApi(data) });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid complaint id' });
  }
}

async function handleUpdate(id, req, res) {
  try {
    const row = toDb(req.body || {});
    const { data, error } = await supabase
      .from('complaints')
      .update(row)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return res.status(400).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Complaint not found' });
    return res.status(200).json({ success: true, data: toApi(data) });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

async function handleDelete(id, res) {
  try {
    const { data, error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) return res.status(400).json({ success: false, message: error.message });
    if (!data) return res.status(404).json({ success: false, message: 'Complaint not found' });
    return res.status(200).json({ success: true, data: {} });
  } catch (err) {
    return res.status(400).json({ success: false, message: 'Invalid complaint id' });
  }
}
