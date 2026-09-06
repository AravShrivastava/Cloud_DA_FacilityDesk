jest.mock('../lib/supabaseClient', () => {
  // A tiny chainable mock that mimics supabase-js's PostgrestFilterBuilder:
  // every method returns the same chain object, and the chain is
  // "thenable" so `await query` resolves just like the real client.
  const chain = {};
  let nextResult = { data: null, error: null };

  ['select', 'order', 'eq', 'insert', 'update', 'delete'].forEach((method) => {
    chain[method] = jest.fn(() => chain);
  });
  chain.single = jest.fn(() => Promise.resolve(nextResult));
  chain.maybeSingle = jest.fn(() => Promise.resolve(nextResult));
  chain.then = (resolve, reject) => Promise.resolve(nextResult).then(resolve, reject);

  chain.__setNextResult = (result) => {
    nextResult = result;
  };

  return {
    supabase: { from: jest.fn(() => chain) },
    initError: null,
    __chain: chain,
  };
});

const supabaseMock = require('../lib/supabaseClient');
const listCreateHandler = require('../api/complaints/index');
const itemHandler = require('../api/complaints/[id]');

function mockRes() {
  const res = {};
  res.status = jest.fn((code) => {
    res.statusCode = code;
    return res;
  });
  res.json = jest.fn((body) => {
    res.body = body;
    return res;
  });
  res.setHeader = jest.fn();
  return res;
}

const dbRow = {
  id: '11111111-1111-1111-1111-111111111111',
  title: 'Broken projector',
  description: 'Projector in room 204 does not turn on',
  category: 'Electrical',
  location: 'Block A - Room 204',
  reported_by: 'Test Student',
  status: 'Open',
  priority: 'Medium',
  created_at: '2026-08-01T00:00:00.000Z',
  updated_at: '2026-08-01T00:00:00.000Z',
};

afterEach(() => jest.clearAllMocks());

test('GET /api/complaints returns a mapped list (200)', async () => {
  supabaseMock.__chain.__setNextResult({ data: [dbRow], error: null });
  const req = { method: 'GET', query: {} };
  const res = mockRes();
  await listCreateHandler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.success).toBe(true);
  expect(res.body.count).toBe(1);
  expect(res.body.data[0].reportedBy).toBe('Test Student'); // snake_case -> camelCase
});

test('POST /api/complaints creates a complaint (201)', async () => {
  supabaseMock.__chain.__setNextResult({ data: dbRow, error: null });
  const req = {
    method: 'POST',
    body: {
      title: 'Broken projector',
      description: 'Projector in room 204 does not turn on',
      category: 'Electrical',
      location: 'Block A - Room 204',
      reportedBy: 'Test Student',
    },
  };
  const res = mockRes();
  await listCreateHandler(req, res);
  expect(res.statusCode).toBe(201);
  expect(res.body.data.status).toBe('Open');
});

test('POST /api/complaints returns 400 when required fields are missing', async () => {
  const req = { method: 'POST', body: { title: 'x' } };
  const res = mockRes();
  await listCreateHandler(req, res);
  expect(res.statusCode).toBe(400);
  expect(res.body.success).toBe(false);
});

test('GET /api/complaints/:id returns one complaint (200)', async () => {
  supabaseMock.__chain.__setNextResult({ data: dbRow, error: null });
  const req = { method: 'GET', query: { id: dbRow.id } };
  const res = mockRes();
  await itemHandler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.data.title).toBe('Broken projector');
});

test('GET /api/complaints/:id returns 404 when not found', async () => {
  supabaseMock.__chain.__setNextResult({ data: null, error: null });
  const req = { method: 'GET', query: { id: 'missing' } };
  const res = mockRes();
  await itemHandler(req, res);
  expect(res.statusCode).toBe(404);
});

test('PUT /api/complaints/:id updates status (200)', async () => {
  supabaseMock.__chain.__setNextResult({ data: { ...dbRow, status: 'In Progress' }, error: null });
  const req = { method: 'PUT', query: { id: dbRow.id }, body: { status: 'In Progress' } };
  const res = mockRes();
  await itemHandler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.data.status).toBe('In Progress');
});

test('DELETE /api/complaints/:id removes a complaint (200)', async () => {
  supabaseMock.__chain.__setNextResult({ data: dbRow, error: null });
  const req = { method: 'DELETE', query: { id: dbRow.id } };
  const res = mockRes();
  await itemHandler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.body.data).toEqual({});
});

test('DELETE /api/complaints/:id returns 404 when not found', async () => {
  supabaseMock.__chain.__setNextResult({ data: null, error: null });
  const req = { method: 'DELETE', query: { id: 'missing' } };
  const res = mockRes();
  await itemHandler(req, res);
  expect(res.statusCode).toBe(404);
});

test('unsupported method on /api/complaints returns 405', async () => {
  const req = { method: 'PATCH', query: {} };
  const res = mockRes();
  await listCreateHandler(req, res);
  expect(res.statusCode).toBe(405);
});

describe('when Supabase is not configured', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../lib/supabaseClient', () => ({
      supabase: null,
      initError: new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable(s).'),
    }));
  });

  afterEach(() => jest.dontMock('../lib/supabaseClient'));

  test('GET /api/complaints returns a clean JSON 500, not a crash', async () => {
    const freshHandler = require('../api/complaints/index');
    const req = { method: 'GET', query: {} };
    const res = mockRes();
    await freshHandler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Server misconfigured/);
  });

  test('GET /api/complaints/:id returns a clean JSON 500, not a crash', async () => {
    const freshHandler = require('../api/complaints/[id]');
    const req = { method: 'GET', query: { id: 'anything' } };
    const res = mockRes();
    await freshHandler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
  });
});
