// Postgres/Supabase columns are snake_case (reported_by, created_at);
// the API and frontend speak camelCase (reportedBy, createdAt), matching
// the original MongoDB/Mongoose version of this app. These two small
// helpers keep that translation in one place.

function toApi(row) {
  if (!row) return row;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    reportedBy: row.reported_by,
    status: row.status,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDb(body) {
  const row = {};
  if (body.title !== undefined) row.title = body.title;
  if (body.description !== undefined) row.description = body.description;
  if (body.category !== undefined) row.category = body.category;
  if (body.location !== undefined) row.location = body.location;
  if (body.reportedBy !== undefined) row.reported_by = body.reportedBy;
  if (body.status !== undefined) row.status = body.status;
  if (body.priority !== undefined) row.priority = body.priority;
  return row;
}

module.exports = { toApi, toDb };
