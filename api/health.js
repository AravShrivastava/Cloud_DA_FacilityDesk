const { initError } = require('../lib/supabaseClient');

module.exports = function handler(req, res) {
  if (initError) {
    return res.status(500).json({
      message: 'Facility Desk API is running, but Supabase is not configured',
      detail: initError.message,
    });
  }
  res.status(200).json({ message: 'Facility Desk API (Vercel + Supabase) is running' });
};
