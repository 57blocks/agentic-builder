# PRD: News Digest Platform

## 1. Executive Summary
The News Digest Platform is a personalized content aggregation service that pulls articles from multiple sources (RSS feeds, news APIs, X / Reddit search), ranks them by user interest, summarizes the top picks with an LLM, and pushes a daily digest to the user. It is designed for knowledge workers who want signal over noise without manually curating dozens of feeds.

The platform is intentionally L-tier scale: a single user-facing request triggers a multi-step background pipeline (fetch → dedupe → rank → summarize → store), so the architecture relies on the queue + worker pattern that the scaffold ships with.

## 2. Problem & Solution
| Pain Point | Solution |
|-----------|----------|
| Users follow too many feeds and miss what matters | Personalized ranking based on user-declared topics and read history |
| RSS readers are noisy; chat / X is overwhelming | One unified daily digest, ≤ 20 stories, summarized |
| LLM API costs add up when summarizing every article | Two-stage filtering: cheap rank first, expensive summarize only the top N |
| Long-running aggregation blocks the UI | Queue-backed worker pipeline with SSE progress stream |

## 3. Goals & Non-Goals
### Goals (v1.0)
- Authenticated users can manage their topic preferences and source list
- Users can manually trigger a "refresh" that runs the full pipeline and stream progress live
- Users can browse a feed of ranked, summarized stories with read / save / dismiss interactions
- Daily auto-refresh runs on a cron schedule per user
- Empty result (zero stories from all sources) is a normal completed state, not an error

### Non-Goals
- Multi-user shared workspaces (single-user accounts only in v1)
- Native mobile apps
- Comment threads / social features
- Custom LLM model fine-tuning

## 4. Feature Requirements

### Authentication
- **FR-AU01 (P0)**: Users can register with email + password.
- **FR-AU02 (P0)**: Users can log in and receive a JWT.
- **FR-AU03 (P0)**: Users can log out from any authenticated page.
- **FR-AU04 (P1)**: Users can reset password via email.

### Topic & Source Management
- **FR-TS01 (P0)**: Users can declare 3–20 topics of interest (tags).
- **FR-TS02 (P0)**: Users can add / remove RSS sources by URL.
- **FR-TS03 (P0)**: Users can toggle built-in source connectors (HackerNews, Reddit, X) per account.
- **FR-TS04 (P1)**: Users can mute a specific source author / domain.

### Aggregation Pipeline
- **FR-AG01 (P0)**: A "Refresh Now" button enqueues a pipeline run and returns a `run_id` within 1.5 seconds.
- **FR-AG02 (P0)**: The run progresses through stages: `fetch_sources` → `dedupe` → `rank` → `summarize_top_n` → `persist`. Each stage emits a progress event the frontend SSE consumes.
- **FR-AG03 (P0)**: A run that returns zero stories MUST complete with `status="completed"` and `story_count=0`, NOT throw.
- **FR-AG04 (P0)**: A user can have at most ONE active run at a time. Triggering refresh while a previous run is `running` returns the existing `run_id`.
- **FR-AG05 (P1)**: Per-user nightly cron run at 06:00 in user's timezone.
- **FR-AG06 (P1)**: Failed runs are retried up to 2 times with exponential backoff.

### Feed & Story Reading
- **FR-FD01 (P0)**: Users see a ranked feed of stories grouped by run.
- **FR-FD02 (P0)**: Each story card shows title, source, published time, 1-line LLM summary, and read / save / dismiss actions.
- **FR-FD03 (P0)**: Clicking a story marks it read and opens the original URL in a new tab.
- **FR-FD04 (P1)**: Saved stories are accessible from a separate "Saved" view.
- **FR-FD05 (P1)**: Users can rate a story 👍 / 👎; rating data feeds back into the ranker.

### Observability & Limits
- **FR-OB01 (P0)**: `Refresh Now` is rate-limited to 6 calls / hour / user.
- **FR-OB02 (P0)**: Every external API call is logged with `requestId`, `runId`, and `durationMs`.
- **FR-OB03 (P1)**: LLM cost per run is recorded and exposed in a Settings → Usage panel.

## 5. Pages & Screens

### 5.1 Landing Page
- **URL / Route**: `/`
- **Access**: public
- **Purpose**: Introduce the product, drive sign-up.
- **Key Elements**: Hero, 3 feature cards, primary CTA "Try Free".
- **Interactions**: Click CTA → register page; click "Login" → login page.

### 5.2 Login / Register
- **URL / Route**: `/login`, `/register`
- **Access**: public
- **Purpose**: Authenticate or create account.
- **Key Elements**: Email + password inputs, submit button, switch link.

### 5.3 Dashboard
- **URL / Route**: `/app`
- **Access**: authenticated
- **Purpose**: Show the most recent digest and the refresh trigger.
- **Layout regions**: top nav, run-status banner, feed list, side panel for filters.
- **Key Elements**:
  - "Refresh Now" button (disabled while a run is `running`)
  - Run-progress banner streaming `step / total` from SSE
  - Feed list of story cards (paginated, infinite scroll)
  - Filter panel: by source, by topic, by read state
- **States**:
  - `no-run-yet`: empty placeholder with "Run your first refresh" CTA
  - `running`: progress banner visible, feed shows previous run
  - `completed-empty`: "No stories matched your topics — try widening your interests" placeholder
  - `error`: red banner + retry CTA

### 5.4 Topics Settings
- **URL / Route**: `/settings/topics`
- **Access**: authenticated
- **Purpose**: Manage topic tags and source list.
- **Key Elements**: tag input, list of current tags, source URL list with add / remove, source toggles (HN / Reddit / X).

### 5.5 Saved Stories
- **URL / Route**: `/saved`
- **Access**: authenticated
- **Purpose**: List previously saved stories across runs.

### 5.6 Usage (P1)
- **URL / Route**: `/settings/usage`
- **Access**: authenticated
- **Purpose**: Daily run history, story count, LLM cost.

## 6. Data Model (sketch)

| Table | Notable columns |
|-------|------------------|
| `users` | `id` (uuid), `email`, `password_hash`, `created_at` |
| `topics` | `id`, `user_id`, `tag`, `weight` |
| `sources` | `id`, `user_id`, `kind` (rss / hn / reddit / x), `url`, `enabled` |
| `runs` | `id` (uuid OR `inproc:*`), `user_id`, `status`, `started_at`, `completed_at`, `story_count`, `error_code` |
| `stories` | `id`, `run_id`, `source_id`, `title`, `url`, `summary`, `score`, `published_at`, `read_at`, `saved_at`, `dismissed_at` |
| `usage_events` | `id`, `user_id`, `run_id`, `kind` (llm-call), `cost_usd`, `tokens_in`, `tokens_out`, `created_at` |

## 7. Non-Functional Requirements

- **Performance**: refresh-now enqueue MUST return within 1.5 s; the full pipeline targets p95 ≤ 60 s.
- **Reliability**: zero data loss on backend crash mid-pipeline — `runs` row stays `running` and is reaped on next user refresh via `clearActiveRunsForUser(userId)` before enqueue.
- **Security**: JWT in `Authorization: Bearer` header; passwords hashed with bcrypt; no plaintext secrets in logs (pino redact list covers `password` / `authorization`).
- **Observability**: every pipeline step emits a structured log line with `runId`; LLM costs accumulated to `usage_events`.
- **Rate limiting**: `Refresh Now` 6/h/user; `/api/auth/login` 10/min/IP.

## 8. Out of Scope (v1)

- WebSocket-based live collaboration
- Custom ranking model training UI
- Multi-tenant team workspaces
- iOS / Android native apps
- Importing third-party reading list (Pocket / Instapaper)
