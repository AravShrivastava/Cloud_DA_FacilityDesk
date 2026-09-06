// Same-origin Vercel serverless functions — no separate backend URL needed.
const API_BASE = '/api/complaints';
const HEALTH_URL = '/api/health';

const form = document.getElementById('complaintForm');
const ticketList = document.getElementById('ticketList');
const statusFilter = document.getElementById('statusFilter');
const refreshBtn = document.getElementById('refreshBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const submitBtn = document.getElementById('submitBtn');
const formError = document.getElementById('formError');
const apiStatus = document.getElementById('apiStatus');

const fields = ['title', 'description', 'category', 'location', 'reportedBy', 'priority'];

// ---------- API status ping ----------
async function checkApi() {
  try {
    const res = await fetch(HEALTH_URL);
    if (res.ok) {
      apiStatus.innerHTML = '<span class="dot dot--ok"></span> API online';
    } else {
      throw new Error('bad status');
    }
  } catch {
    apiStatus.innerHTML = '<span class="dot dot--down"></span> API unreachable';
  }
}

// ---------- CREATE / UPDATE ----------
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.textContent = '';

  const id = document.getElementById('complaintId').value;
  const payload = {};
  fields.forEach((f) => (payload[f] = document.getElementById(f).value));

  const isEdit = Boolean(id);
  const url = isEdit ? `${API_BASE}/${id}` : API_BASE;
  const method = isEdit ? 'PUT' : 'POST';

  submitBtn.disabled = true;
  submitBtn.textContent = isEdit ? 'Saving…' : 'Filing…';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      throw new Error(body.message || 'Request failed');
    }
    resetForm();
    await loadTickets();
  } catch (err) {
    formError.textContent = err.message;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = isEdit ? 'Save changes' : 'File ticket';
  }
});

cancelEditBtn.addEventListener('click', resetForm);

function resetForm() {
  form.reset();
  document.getElementById('complaintId').value = '';
  document.getElementById('priority').value = 'Medium';
  submitBtn.textContent = 'File ticket';
  cancelEditBtn.hidden = true;
  formError.textContent = '';
}

// ---------- READ ----------
async function loadTickets() {
  ticketList.innerHTML = '<p class="empty-state">Loading tickets…</p>';
  const status = statusFilter.value;
  const url = status ? `${API_BASE}?status=${encodeURIComponent(status)}` : API_BASE;

  try {
    const res = await fetch(url);
    const body = await res.json();
    if (!res.ok || !body.success) throw new Error(body.message || 'Failed to load tickets');
    renderTickets(body.data);
  } catch (err) {
    ticketList.innerHTML = `<p class="empty-state">Could not load tickets — ${err.message}</p>`;
  }
}

function renderTickets(tickets) {
  if (!tickets.length) {
    ticketList.innerHTML = '<p class="empty-state">No work orders yet. File one on the left.</p>';
    return;
  }

  ticketList.innerHTML = '';
  tickets.forEach((t) => {
    const el = document.createElement('article');
    el.className = 'ticket';
    el.dataset.status = t.status;

    el.innerHTML = `
      <div class="ticket__id">#${t.id.slice(0, 6).toUpperCase()}<br/>${new Date(t.createdAt).toLocaleDateString()}</div>
      <div>
        <h3 class="ticket__title">${escapeHtml(t.title)}</h3>
        <p class="ticket__desc">${escapeHtml(t.description)}</p>
        <div class="ticket__meta">
          <span class="tag">${escapeHtml(t.category)}</span>
          <span class="tag">${escapeHtml(t.location)}</span>
          <span class="tag">${escapeHtml(t.priority)} priority</span>
          <span class="tag">by ${escapeHtml(t.reportedBy)}</span>
          <span class="tag tag--status-${t.status.replace(' ', '')}">${t.status}</span>
        </div>
      </div>
      <div class="ticket__actions">
        <select data-action="status" data-id="${t.id}">
          <option value="Open" ${t.status === 'Open' ? 'selected' : ''}>Open</option>
          <option value="In Progress" ${t.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Resolved" ${t.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
        </select>
        <button class="btn btn--ghost btn--small" data-action="edit" data-id="${t.id}">Edit</button>
        <button class="btn btn--ghost btn--small" data-action="delete" data-id="${t.id}">Delete</button>
      </div>
    `;
    ticketList.appendChild(el);
  });
}

// ---------- UPDATE (status dropdown) / EDIT / DELETE ----------
ticketList.addEventListener('change', async (e) => {
  if (e.target.dataset.action !== 'status') return;
  const id = e.target.dataset.id;
  await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: e.target.value }),
  });
  await loadTickets();
});

ticketList.addEventListener('click', async (e) => {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;
  if (!action || !id) return;

  if (action === 'delete') {
    if (!confirm('Delete this work order?')) return;
    await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
    await loadTickets();
  }

  if (action === 'edit') {
    const res = await fetch(`${API_BASE}/${id}`);
    const body = await res.json();
    if (!body.success) return;
    const t = body.data;
    document.getElementById('complaintId').value = t.id;
    fields.forEach((f) => (document.getElementById(f).value = t[f]));
    submitBtn.textContent = 'Save changes';
    cancelEditBtn.hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
});

statusFilter.addEventListener('change', loadTickets);
refreshBtn.addEventListener('click', loadTickets);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- init ----------
checkApi();
loadTickets();
