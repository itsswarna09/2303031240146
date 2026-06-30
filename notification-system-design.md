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

## Stage 3: Query Optimization

### Original Query
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt ASC;
```

### Why This Is Slow

With 50,000 students and 5,000,000 notifications, this query is slow because:

- Without a composite index covering `studentID`, `isRead`, and `createdAt`, the database performs a full table scan, checking every row against the WHERE conditions.
- Even with a single-column index on `studentID`, the database would still need to filter `isRead` and sort `createdAt` separately, adding overhead.
- `SELECT *` retrieves all columns, including potentially large text fields (`message`), increasing I/O cost unnecessarily if only specific fields are needed.

### Recommended Fix

Add a composite index matching the query's filter and sort pattern:

```sql
CREATE INDEX idx_student_unread_created ON notifications (student_id, is_read, created_at);
```

This lets the database use a single index scan to filter by student and read status, and return results already sorted by `created_at`, avoiding a separate sort step.

### Query for Placement Notifications in the Last 7 Days

```sql
SELECT id, student_id, message, created_at
FROM notifications
WHERE notification_type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

Backed by the existing `idx_type_created` index on `(notification_type, created_at)`, this scans only relevant rows rather than the full table.

### Is "Add Indexes Everywhere" Good Advice?

No. Indexes aren't free:

- Every additional index slows down INSERT/UPDATE/DELETE operations, since each index must be updated alongside the data.
- Indexes consume additional storage, which grows significantly at this scale (millions of rows).
- Excess, unused indexes increase query planner complexity without improving read performance for queries that don't use them.

The better approach is to index based on actual, observed query patterns (as done above for `studentID`/`isRead`/`createdAt` and `notification_type`/`created_at`), not defensively across all columns.

## Stage 4: Reducing Repeated Fetch Overhead

### Problem

Notifications are fetched on every page load for every student, overwhelming the DB under high traffic and degrading user experience (slow loads, potential timeouts).

### Recommended Strategy

**1. Caching layer (Redis)**
Cache each student's unread notification list (or count) with a short TTL (e.g., 30-60 seconds). Most page loads can be served from cache instead of hitting the DB directly.
- *Tradeoff:* introduces slight staleness (a new notification might take up to the TTL window to appear) and adds cache invalidation complexity when a notification is marked read.

**2. Push instead of poll**
Replace "fetch on every page load" with a real-time push mechanism (WebSockets or Server-Sent Events). The client maintains a live connection and receives new notifications as they happen, rather than re-querying on each load.
- *Tradeoff:* more complex infrastructure (persistent connections, scaling WebSocket servers), but drastically reduces redundant DB reads.

**3. Client-side caching with invalidation**
Cache the notification list in browser memory/local state once fetched, and only refetch when the user explicitly triggers an action (e.g., opens the notification panel) or receives a push signal that new data is available — instead of refetching on every navigation.

**4. Pagination + lazy loading**
Don't fetch the entire notification history at once — fetch a small page (e.g., 10-20 items) initially, loading more only as the user scrolls or requests it.

### Recommended Combination

For this use case, a combination of (2) push-based updates for real-time new notifications + (3) client-side caching to avoid redundant fetches gives the best balance: low latency for new alerts, minimal redundant DB load, without the staleness risk of pure server-side caching. Caching (1) can be layered in as a secondary optimization for read-heavy endpoints like "get unread count."

## Stage 5: Reliable Bulk Notification Delivery

### Issues With the Proposed Implementation
- **Synchronous, sequential processing:** looping through 50,000 students one at a time, with a blocking email call each iteration, is slow and doesn't scale — a single slow or hanging email call delays every subsequent student.
- **No fault isolation:** if `send_email` fails for one student, there's no handling shown — it's unclear whether the loop continues, retries, or aborts. The reported failure for 200 students midway suggests the whole batch wasn't resilient to partial failures.
- **No retry mechanism:** a transient failure (network blip, rate limit from email provider) permanently loses that notification with no second attempt.
- **Tight coupling of concerns:** email sending, DB persistence, and push notification are all bundled in one synchronous flow per student — if one step fails, it's unclear what state the other two are left in (e.g., was it saved to DB even though the email failed?).

### Why It Failed for 200 Students Midway

Likely causes: the email provider rate-limited or temporarily failed for a batch of requests sent in rapid succession synchronously, and since there's no retry or error handling shown, those 200 simply got skipped/lost rather than retried.

### Redesigned Approach

1. **Save to DB first, always** — persist all 50,000 notifications to the database immediately in a single batch insert. This is the source of truth; once saved, no notification is "lost" even if delivery (email/push) later fails.
2. **Queue-based async delivery** — push each student's notification job onto a message queue (e.g., SQS, RabbitMQ, BullMQ) instead of looping synchronously. Worker processes consume the queue and handle email/push delivery independently and in parallel.
3. **Retry with backoff** — each queued job gets automatic retries (e.g., 3 attempts with exponential backoff) on failure, and failed jobs after max retries go to a dead-letter queue for manual review/reprocessing rather than silently disappearing.
4. **Decouple email and push** — these are independent delivery channels; a failure in one shouldn't block or be conflated with the other. Process them as separate queued jobs.

### Should DB Save and Email Send Happen Together?

No — they should be decoupled. The DB save is a low-risk, fast, reliable operation and should happen first and synchronously as a batch. Email/push delivery are slower, less reliable (third-party dependent) operations and should be handled asynchronously via the queue. Coupling them means a flaky email provider can block or corrupt the more reliable DB write, which is the core flaw in the original design.

### Revised Pseudocode
batch_save_to_db(notifications)  // single reliable batch write

for student_id in student_ids:
    enqueue_job("send_email", {student_id, message})
    enqueue_job("push_to_app", {student_id, message})

// Workers consume queue independently, with retry + dead-letter handling