# Notification System Design

## Stage 1: REST API Design

### Overview
The notification platform needs endpoints to fetch, filter, and update notification status for logged-in students. Below are the proposed REST endpoints with their contracts.

### Endpoints

#### 1. Get All Notifications
- **Method:** GET
- **Path:** `/api/notifications`
- **Headers:** `Authorization: Bearer <token>`
- **Query Params:** `page` (int, optional), `limit` (int, optional), `type` (string, optional — Event/Result/Placement)
- **Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "Placement",
      "message": "string",
      "timestamp": "2026-04-22T17:51:30Z",
      "isRead": false
    }
  ],
  "page": 1,
  "totalPages": 5
}
```

#### 2. Get Single Notification
- **Method:** GET
- **Path:** `/api/notifications/:id`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** single notification object as above
- **Response (404):** `{ "error": "Notification not found" }`

#### 3. Mark Notification as Read
- **Method:** PATCH
- **Path:** `/api/notifications/:id/read`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** `{ "id": "uuid", "isRead": true }`

#### 4. Get Priority/Top Notifications
- **Method:** GET
- **Path:** `/api/notifications/priority`
- **Headers:** `Authorization: Bearer <token>`
- **Query Params:** `n` (int, default 10)
- **Response (200):** array of top N notifications sorted by weight (Placement > Result > Event) then recency

### Design Principles
- Predictable, resource-based naming (`/notifications`, not `/getNotifications`)
- Plural nouns for collections, consistent verb-less paths (HTTP method conveys the action)
- Pagination on list endpoints to avoid large payloads
- All endpoints require Bearer token authentication
- Consistent JSON envelope and field naming (camelCase) across responses

## Stage 2: Persistent Storage Design

### Database Choice: PostgreSQL (Relational)

Notifications have a fixed, well-defined schema (type, message, timestamp, read status, student association) with predictable query patterns — filtering by student, type, and read status, and sorting by recency. A relational database fits this well because:

- Strong support for indexing on multiple columns, critical for fast filtering at scale (50,000+ students, millions of notifications)
- ACID guarantees matter here — a notification should never be lost or duplicated, especially for placement-related alerts
- Mature tooling for schema migrations as requirements evolve (e.g., adding new notification types later)

A NoSQL document store (e.g., MongoDB) could work too, but offers no real advantage here since the data isn't deeply nested or schema-flexible — it's flat, tabular, and benefits more from relational indexing and joins (e.g., joining notifications to a students table).

### Proposed Schema

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id INT NOT NULL REFERENCES students(id),
  notification_type VARCHAR(20) NOT NULL CHECK (notification_type IN ('Event', 'Result', 'Placement')),
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_student_unread ON notifications (student_id, is_read, created_at);
CREATE INDEX idx_type_created ON notifications (notification_type, created_at);
```

### Anticipated Problems as Data Volume Increases

- **Table bloat:** millions of rows over time slow down scans and increase index maintenance cost on every insert.
  - *Mitigation:* partition the table by `created_at` (e.g., monthly partitions), and archive/move old read notifications to a cold-storage table.
- **Write contention:** simultaneous inserts during high-traffic events (e.g., results day) could cause lock contention.
  - *Mitigation:* batch inserts where possible, and consider a write-behind queue (e.g., insert into a queue, async-write to DB) to smooth spikes.
- **Index overhead:** more indexes speed reads but slow every insert/update; only the two indexes above are added, targeting actual query patterns rather than indexing every column defensively.
- **Pagination at scale:** offset-based pagination (`LIMIT/OFFSET`) gets slower as the offset grows; cursor-based pagination (using `created_at` + `id` as a cursor) avoids this and is recommended once the table grows large.