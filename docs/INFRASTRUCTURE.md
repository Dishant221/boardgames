# BoardGamesEpic Infrastructure Documentation

**Project:** www.boardgamesepic.com  
**Status:** 🚀 In Development  
**Last Updated:** 2026-09-07  
**Architecture Version:** 1.0

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Cloudflare Services](#cloudflare-services)
4. [Database Design](#database-design)
5. [Deployment Pipeline](#deployment-pipeline)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Architecture](#security-architecture)
8. [Cost Optimization](#cost-optimization)
9. [Disaster Recovery](#disaster-recovery)
10. [Implementation Checklist](#implementation-checklist)

---

## Architecture Overview

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     End User (Browser)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Cloudflare CDN & Edge Network                  │
│  • Global caching                                            │
│  • DDoS protection                                           │
│  • SSL/TLS termination                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  Cloudflare      │      │  Cloudflare      │
│  Pages (React)   │      │  Workers (API)   │
│  www.            │      │  api.            │
│  boardgames      │      │  boardgames      │
│  epic.com        │      │  epic.com        │
└────────┬─────────┘      └────────┬─────────┘
         │                         │
         │                    ┌────┴─────┐
         │                    │           │
         │                    ▼           ▼
         │              ┌──────────────┬──────────────┐
         │              │   D1         │  Durable     │
         │              │  Database    │  Objects     │
         │              │  (Persistent)│ (Real-time)  │
         │              └──────┬───────┴──────┬───────┘
         │                     │              │
         │              ┌──────┴──────┐       │
         │              │             │       │
         │              ▼             ▼       ▼
         │         ┌─────────┐  ┌──────────┐
         │         │   KV    │  │   R2     │
         │         │  Store  │  │  Storage │
         │         │(Caching)│  │(Assets)  │
         │         └─────────┘  └──────────┘
         │
         └──────────────────────────────────┐
                                            │
                                            ▼
                            ┌───────────────────────┐
                            │  Browser Cache (SW)   │
                            │  Service Worker       │
                            │  Offline Support      │
                            └───────────────────────┘
```

### Architecture Philosophy

**Client-Side Heavy:** Minimize server compute to reduce Cloudflare costs
- Game logic runs on client with server validation
- Real-time sync via Durable Objects (only for active sessions)
- Assets cached aggressively

**Edge-First:** Leverage Cloudflare's global edge network
- Static content served from edge (Pages)
- API routed through nearest Worker
- Database queries cached in KV

**Serverless:** No traditional servers to manage
- Auto-scaling
- Pay-per-use pricing
- No infrastructure overhead

---

## Technology Stack

### Frontend
```
React 18 (TypeScript)
├── Vite (build tool)
├── Tailwind CSS (styling)
├── Framer Motion (animations)
├── Zustand (state management)
├── React Router (navigation)
├── Socket.io-client (WebSockets)
├── Pixi.js (2D graphics)
└── Axios (HTTP client)
```

### Backend
```
Cloudflare Workers
├── Hono (lightweight framework)
├── TypeScript (type safety)
├── jsonwebtoken (authentication)
├── bcryptjs (password hashing)
└── Zod (validation)
```

### Infrastructure
```
Cloudflare Services
├── Pages (static hosting + CDN)
├── Workers (serverless compute)
├── D1 (SQLite database)
├── KV (key-value caching)
├── R2 (object storage)
├── Durable Objects (real-time state)
├── Email Routing (transactional emails)
└── Access (optional: identity + access)
```

### DevOps
```
├── GitHub (version control)
├── GitHub Actions (CI/CD)
├── Wrangler CLI (Cloudflare tools)
└── npm (package management)
```

---

## Cloudflare Services

### 1. Cloudflare Pages (Frontend)

**Purpose:** Host React web application with global CDN

**Configuration:**
```
Repository: Dishant221/boardgames
Build Command: cd packages/frontend && npm run build
Build Output: packages/frontend/dist
Environments:
  - Production (main branch → www.boardgamesepic.com)
  - Preview (PRs → *.preview.boardgamesepic.com)
  - Testing (testing branch → test.boardgamesepic.com)
```

**Features:**
- ✅ Automatic HTTPS
- ✅ Global CDN caching
- ✅ Git-based deployments
- ✅ Preview deployments for PRs
- ✅ Environment variables per environment
- ✅ Serverless functions support

**Cost:** FREE (unlimited deployments)

**Performance Targets:**
- LCP < 2.5s (Largest Contentful Paint)
- FID < 100ms (First Input Delay)
- CLS < 0.1 (Cumulative Layout Shift)
- Time to First Byte < 1.3s

---

### 2. Cloudflare Workers (Backend API)

**Purpose:** Serverless compute for game logic and API endpoints

**Configuration:**
```toml
# Production Worker
name = "boardgames-prod"
route = "api.boardgamesepic.com/*"

# Testing Worker
name = "boardgames-testing"
route = "test-api.boardgamesepic.com/*"
```

**Endpoints:**
```
POST   /api/auth/register        - User registration
POST   /api/auth/login           - User login
POST   /api/auth/logout          - User logout
POST   /api/auth/refresh         - Refresh JWT token
GET    /api/user/profile         - Get user profile
PUT    /api/user/profile         - Update user profile

POST   /api/games/create         - Create new game session
GET    /api/games/join/:id       - Join game session
POST   /api/games/:id/move       - Make game move
GET    /api/games/:id/state      - Get game state
POST   /api/games/:id/leave      - Leave game session

GET    /api/leaderboard/:game    - Get leaderboard
GET    /api/stats/:userId        - Get player statistics
GET    /api/games/history/:userId - Get game history

GET    /api/health               - Health check
```

**Features:**
- ✅ Global edge execution
- ✅ Automatic scaling
- ✅ WebSocket support (via Durable Objects)
- ✅ Cron triggers (for cleanup jobs)
- ✅ Environment-specific configuration

**Cost:** 
- FREE: 100,000 requests/day
- Paid: $0.50 per million requests

**Rate Limiting:**
- 100 requests/min per IP
- 10 requests/min for auth endpoints
- 1000 requests/min per authenticated user

---

### 3. Cloudflare D1 (Database)

**Purpose:** Persistent data storage (SQLite)

**Databases:**
```
Production:
  - boardgames-prod (main database)
  - Replicated backups daily

Testing:
  - boardgames-testing (QA database)
  - Separate from production

Preview:
  - Local SQLite for development
```

**Tables & Schema:**

#### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,           -- UUID
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,   -- bcrypt
  avatar_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT 1
);
```

#### Game Sessions Table
```sql
CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY,           -- UUID
  game_type TEXT NOT NULL,       -- 'monopoly', etc.
  status TEXT NOT NULL,          -- 'waiting', 'playing', 'completed'
  players TEXT NOT NULL,         -- JSON array
  board_state TEXT NOT NULL,     -- Full game state JSON
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  started_at DATETIME,
  ended_at DATETIME,
  winner_id TEXT,
  FOREIGN KEY (winner_id) REFERENCES users(id)
);
```

#### Player Stats Table
```sql
CREATE TABLE player_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_money_earned INTEGER DEFAULT 0,
  favorite_game TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Leaderboard Table
```sql
CREATE TABLE leaderboard (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  rank INTEGER,
  score INTEGER,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, game_type)
);
```

#### Game History Table
```sql
CREATE TABLE game_history (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  final_position INTEGER,
  money_earned INTEGER,
  duration_seconds INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES game_sessions(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### Auth Tokens Table
```sql
CREATE TABLE auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  refresh_token TEXT UNIQUE NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_game_sessions_status ON game_sessions(status);
CREATE INDEX idx_game_sessions_created ON game_sessions(created_at);
CREATE INDEX idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX idx_leaderboard_game_type ON leaderboard(game_type);
CREATE INDEX idx_leaderboard_rank ON leaderboard(rank);
CREATE INDEX idx_game_history_user_id ON game_history(user_id);
```

**Features:**
- ✅ SQL queries
- ✅ Automatic backups
- ✅ Point-in-time recovery
- ✅ High availability

**Cost:**
- FREE: 100 MB storage, 1 million write operations
- Paid: $0.75 per million writes

**Backup Strategy:**
- Automatic daily backups
- 30-day retention
- Export backups weekly to R2

---

### 4. Cloudflare KV (Key-Value Store)

**Purpose:** High-performance caching layer

**Use Cases:**
```
Namespace: CACHE
├── game_session:{sessionId}      - Active game state cache
├── player_profile:{userId}       - User profile cache (TTL: 1h)
├── leaderboard:{game}            - Leaderboard cache (TTL: 5m)
├── rate_limit:{endpoint}:{ip}    - Rate limiting counters
└── asset_manifest                - CDN asset manifest cache
```

**Configuration:**
```
Production Namespace:
  - KV_NAMESPACE_ID_PROD
  - TTL: 3600s (default)
  - Replicate to all regions

Testing Namespace:
  - KV_NAMESPACE_ID_TEST
  - TTL: 600s (default)
  - Separate from production
```

**Cache Strategy:**
```
Cache Invalidation:
├── Automatic: TTL expiration
├── Manual: Update trigger on D1 writes
├── Conditional: Only cache if recent (< 1 min)
└── Event-driven: Purge on game completion
```

**Features:**
- ✅ Global replication
- ✅ Automatic expiration (TTL)
- ✅ Atomic operations
- ✅ Metadata support

**Cost:**
- FREE: 100,000 write ops/month, 1M read ops/month
- Paid: $0.50 per million writes

---

### 5. Cloudflare R2 (Object Storage)

**Purpose:** Store game assets, images, audio, 3D models

**Buckets:**
```
Production:
  - boardgames-assets (public)
    ├── images/
    │   ├── board/
    │   ├── tokens/
    │   ├── properties/
    │   └── ui/
    ├── audio/
    │   ├── background-music/
    │   ├── sfx/
    │   └── voice/
    ├── models/
    │   └── 3d/
    └── videos/
        └── tutorials/

Testing:
  - boardgames-assets-preview
```

**Domains:**
```
Production: r2.boardgamesepic.com
Testing: preview-r2.boardgamesepic.com
```

**File Format Optimization:**
```
Images:
  - WebP (primary): boardgames/*.webp
  - PNG fallback: boardgames/*.png
  - Sizes: 100x100, 200x200, 400x400 (responsive)

Audio:
  - MP3 (180kbps): *.mp3
  - OGG (128kbps): *.ogg
  - Compression: Enabled

3D Models:
  - glTF 2.0 (.gltf, .glb)
  - Max size: 5MB per model
  - Compressed with gzip
```

**Features:**
- ✅ S3-compatible API
- ✅ Public access with custom domain
- ✅ CORS headers configured
- ✅ Lifecycle policies

**Cost:**
- FREE: 10 GB/month egress
- Paid: $0.015/GB egress

**Lifecycle Policy:**
```
Delete unverified uploads after 24h
Move old game recordings to cold storage after 30 days
```

---

### 6. Cloudflare Durable Objects

**Purpose:** Real-time multiplayer game state synchronization

**Classes:**

#### GameSession Class
```typescript
interface GameSession {
  id: string;
  gameType: 'monopoly';
  players: Player[];
  boardState: BoardState;
  currentTurnIndex: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Methods:**
- `joinGame(userId)` - Player joins session
- `leaveGame(userId)` - Player leaves session
- `makeTurn(move)` - Execute game move
- `rollDice()` - Server-side dice roll
- `getState()` - Get current game state
- `broadcast()` - Push updates to all players

**WebSocket Flow:**
```
Player 1 ──WebSocket─→ Worker ──→ Durable Object (GameSession)
                                        ↓
                                    Validate Move
                                        ↓
                                   Update State
                                        ↓
Player 2 ←──WebSocket── Worker ←────────┤
Player 3 ←──WebSocket── Worker ←────────┘
Player 4 ←──WebSocket── Worker
```

**Features:**
- ✅ Atomic transactions
- ✅ Built-in storage (KV)
- ✅ WebSocket support
- ✅ Durable storage (survive Worker restarts)

**Cost:**
- FREE: 3 objects, 1M requests/month
- Paid: $0.20 per million requests

**Lifecycle:**
- Create on game start
- Delete 5 minutes after all players leave
- Clean up stale sessions nightly

---

## Database Design

### Data Flow

```
                 Frontend (React)
                      ↓
            User Input (Move, Chat, etc.)
                      ↓
         Cloudflare Worker (API)
                      ↓
      ┌───────────────┼───────────────┐
      ↓               ↓               ↓
  KV Cache      D1 Database    Durable Objects
  (Hits: 90%)   (Fallback)      (Real-time)
                      ↓
            Response to Frontend
                      ↓
            Update React State
                      ↓
            Render Update
```

### Query Patterns

**Read-Heavy:**
- Leaderboard (cache 5 minutes)
- Player stats (cache 1 hour)
- Game history (no cache, direct from D1)

**Write-Heavy:**
- Game moves (D1 + Durable Object + KV invalidate)
- Player stats (batch update hourly)
- Leaderboard (update after game completion)

**Real-Time:**
- Active game state (Durable Objects only)
- Player positions (broadcast via WebSocket)
- Chat messages (if implemented)

### Relationships

```
User
├── has many: player_stats (1:1 unique)
├── has many: game_sessions (as player)
├── has many: game_history (1:many)
└── has many: leaderboard_entries (game_type:1)

GameSession
├── belongs to: many users (players)
├── has many: game_history entries
└── has one: winner (user)

Leaderboard
├── belongs to: user
├── scoped by: game_type
└── unique constraint: (user_id, game_type)
```

---

## Deployment Pipeline

### Git Workflow

```
                    Feature Branch
                   (feature/*)
                         ↓
                    Create PR
                         ↓
              GitHub Actions: Test
              • npm run lint
              • npm run test
              • npm run build
                         ↓ (pass)
                  Code Review
                         ↓ (approved)
                    Merge to Testing
                   (testing branch)
                         ↓
         GitHub Actions: Deploy to Testing
         • Deploy frontend to Pages (preview)
         • Deploy Worker to testing environment
         • Run E2E tests
                         ↓ (pass)
                    Create PR to Main
                         ↓
                  Final Code Review
                         ↓ (approved)
                    Merge to Main
                    (main branch)
                         ↓
        GitHub Actions: Deploy to Production
        • Deploy frontend to Pages (www)
        • Deploy Worker to production
        • Run smoke tests
        • Send deployment notification
```

### CI/CD Pipeline Details

#### Job: Lint & Test
```yaml
- Runs on: ubuntu-latest
- Node version: 18
- Steps:
  1. Checkout code
  2. Install dependencies
  3. Run ESLint (frontend + backend)
  4. Type checking (tsc)
  5. Unit tests (vitest)
  6. Integration tests
- Time: ~5 minutes
```

#### Job: Build
```yaml
- Runs on: ubuntu-latest
- Node version: 18
- Steps:
  1. Checkout code
  2. Install dependencies
  3. Build frontend (vite build)
  4. Build backend (esbuild)
  5. Upload artifacts
- Time: ~3 minutes
- Artifacts:
  - frontend-dist (dist/ folder)
  - backend-dist (dist/index.js)
```

#### Job: Deploy to Testing
```yaml
- Trigger: Push to testing branch
- Steps:
  1. Checkout code
  2. Download build artifacts
  3. Deploy frontend to Cloudflare Pages (testing env)
  4. Deploy Worker to boardgames-testing
  5. Run smoke tests
  6. Notify in Slack
- Time: ~2 minutes
- URL: test.boardgamesepic.com
```

#### Job: Deploy to Production
```yaml
- Trigger: Push to main branch
- Steps:
  1. Checkout code
  2. Download build artifacts
  3. Deploy frontend to Cloudflare Pages (production)
  4. Deploy Worker to boardgames-prod
  5. Run health checks
  6. Create GitHub release
  7. Notify in Slack
- Time: ~3 minutes
- URL: www.boardgamesepic.com
```

### Rollback Procedure

**If production deployment fails:**
1. GitHub Actions automatically retries failed jobs
2. On second failure, deployment is halted
3. Manual rollback:
   ```bash
   # Revert to previous commit
   git revert <commit-hash>
   git push origin main
   
   # Or rollback via Cloudflare UI
   # Pages: Select previous deployment
   # Workers: Revert to previous script version
   ```

---

## Monitoring & Logging

### Metrics Collected

**Application Metrics:**
- Requests per second (RPS)
- Error rate (%)
- Response time (P50, P95, P99)
- Worker CPU time (ms)
- Database query time (ms)
- Cache hit ratio (%)

**User Metrics:**
- Daily Active Users (DAU)
- Session duration (avg)
- Game completion rate
- Player retention
- Churn rate

**Infrastructure Metrics:**
- D1 query count
- KV hit/miss ratio
- R2 egress (GB)
- Durable Object requests
- Worker invocations

**Error Tracking:**
- Worker errors
- Database errors
- Authentication failures
- WebSocket disconnects
- API timeouts

### Logging Strategy

**Log Levels:**
```
ERROR - Critical failures (sent to alert)
WARN  - Unexpected behavior (logged)
INFO  - User actions (game moves, login)
DEBUG - Internal flow (cache hits, DB queries)
TRACE - Detailed (parameter values)
```

**Log Destinations:**
```
Cloudflare Logpush
└── → Workers Analytics
    → KV (JSON logs)
    → Custom dashboard (Grafana/Datadog)

Application Logs
└── → Error tracking (Sentry/Rollbar)
    → Email alerts (critical only)
    → Slack channel (#alerts)
```

**Log Retention:**
- Operational: 7 days
- Compliance: 90 days
- Archive: 1 year (R2)

### Alerting

**Threshold Alerts:**
```
ERROR rate > 5%:
  • Severity: HIGH
  • Action: Page on-call engineer
  
Response time P95 > 5s:
  • Severity: MEDIUM
  • Action: Log and monitor
  
Database errors > 10 in 5m:
  • Severity: HIGH
  • Action: Page on-call DBA

Worker timeout > 50ms:
  • Severity: MEDIUM
  • Action: Log and optimize
```

---

## Security Architecture

### Authentication Flow

```
User Input (Email + Password)
         ↓
    Validate Format
    (email, password length)
         ↓
Query Database: SELECT * FROM users WHERE email = ?
         ↓
User Found?
  ├─ NO: Return 401 Unauthorized
  └─ YES:
      ↓
Compare password_hash with bcrypt(input)
      ↓
Match?
  ├─ NO: Return 401 Unauthorized
  └─ YES:
      ↓
Generate JWT Token
  - Payload: {userId, username, email, iat, exp}
  - Secret: CLOUDFLARE_SECRET (stored in Worker secrets)
  - Exp: 15 minutes
      ↓
Generate Refresh Token
  - Random 256-bit token
  - Store in auth_tokens table
  - Exp: 7 days
      ↓
Send Response:
  - Set HTTP-Only cookie: jwt_token
  - Set HTTP-Only cookie: refresh_token
  - Samsite: Strict
  - Secure: Yes (HTTPS only)
      ↓
Client Stores:
  - HTTP-Only cookies (auto-sent)
  - Local state (non-sensitive)
```

### Authorization Flow

```
API Request with JWT
         ↓
Extract JWT from cookie
         ↓
Verify JWT signature
  - Secret matches?
  - Token not expired?
         ↓
Token Valid?
  ├─ NO: Return 401, trigger refresh flow
  └─ YES:
      ↓
Extract userId from JWT
         ↓
Check Database Permissions
  - Can user access resource?
  - Is user in game session?
         ↓
Permission Granted?
  ├─ NO: Return 403 Forbidden
  └─ YES:
      ↓
Execute API endpoint
      ↓
Audit log the action
```

### Data Protection

**In Transit:**
- ✅ HTTPS only (TLS 1.2+)
- ✅ Cloudflare SSL/TLS (strict mode)
- ✅ WSS for WebSockets (encrypted)
- ✅ HSTS headers (force HTTPS)

**At Rest:**
- ✅ D1 encryption (SQLite encryption)
- ✅ Password hashing: bcrypt (cost: 12)
- ✅ Sensitive fields encrypted (email in logs)
- ✅ PII never logged
- ✅ Backup encryption (R2 server-side)

**In Application:**
- ✅ Input validation (Zod schema)
- ✅ SQL parameterized queries
- ✅ XSS prevention (React auto-escape)
- ✅ CSRF tokens on state-changing endpoints
- ✅ Rate limiting per IP & user

### Security Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' https://cdnjs.cloudflare.com;
  style-src 'self' https://fonts.googleapis.com;
  img-src 'self' data: https://r2.boardgamesepic.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.boardgamesepic.com wss://api.boardgamesepic.com;
  frame-ancestors 'none'

Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: 
  accelerometer=(),
  ambient-light-sensor=(),
  autoplay=(),
  camera=(),
  geolocation=(),
  gyroscope=(),
  magnetometer=(),
  microphone=(),
  payment=(),
  usb=()
```

---

## Cost Optimization

### Current Free Tier Usage

```
Cloudflare Pages:
  - Unlimited deployments
  - Unlimited bandwidth (cached)
  - Cost: $0/month

Cloudflare Workers:
  - 100,000 requests/day
  - ~3M requests/month (free limit)
  - Cost: $0/month (if < 100k/day)

Cloudflare D1:
  - 100 MB storage
  - 1M write operations/month
  - Cost: $0/month (if < 1M writes)

Cloudflare KV:
  - 100k write ops/month
  - 1M read ops/month
  - Cost: $0/month

Cloudflare R2:
  - 10 GB/month egress
  - Cost: $0/month (if < 10GB egress)

Durable Objects:
  - 3 objects
  - 1M requests/month
  - Cost: $0/month (if < 1M requests)

Total Monthly Cost: $0 (within free tier limits)
```

### Optimization Strategies

**1. Minimize Worker Requests**
```
- Cache static assets on CDN
- Use KV for frequently accessed data
- Reduce D1 queries via caching
- Implement request batching
```

**2. Optimize Database Usage**
```
- Proper indexing (7 indexes created)
- Batch write operations
- Purge old game sessions weekly
- Archive game history monthly to R2
```

**3. Reduce Bandwidth**
```
- WebP format for images (30% smaller)
- Gzip compression for all responses
- Lazy load game assets
- CDN cache headers (30 days for images)
```

**4. Efficient Game Engine**
```
- Client-side game logic (no server compute)
- Batch state updates (not per-move)
- Compress board state JSON
- Use delta updates (only changes)
```

**5. Monitoring Costs**
```
Track monthly usage:
- Workers requests
- D1 writes
- KV read/writes
- R2 egress
- Durable Object requests

Alert if:
- Workers > 80k requests/day
- D1 writes > 800k/month
- R2 egress > 8GB/month
```

### Scaling Beyond Free Tier

**When you need to scale:**

```
$ 0-100 Users:
  - Workers: +$0 (still under 100k/day)
  - D1: +$0 (still under 1M writes)
  - Total: $0/month

$ 100-1,000 Users:
  - Workers: +$10-50 (2-5M requests)
  - D1: +$1-5 (1-5M writes)
  - KV: +$5-10 (increased cache misses)
  - Total: $16-65/month

$ 1,000-10,000 Users:
  - Workers: +$50-300
  - D1: +$5-25
  - KV: +$10-50
  - R2: +$5-15 (if 5GB+ assets)
  - Durable Objects: +$10-50
  - Total: $80-440/month

$ 10,000+ Users:
  - Consider dedicated infrastructure
  - Or negotiate Cloudflare enterprise pricing
```

---

## Disaster Recovery

### Backup Strategy

**Database Backups:**
```
Frequency: Daily at 2 AM UTC
Location: R2 bucket (boardgames-backups/)
Retention: 30 days rolling
Format: SQLite dump (.sql)
Size: ~10-50 MB per backup
```

**Backup Verification:**
```
- Restore test weekly
- Verify data integrity
- Check backup size trends
- Alert if backup fails
```

**Recovery Procedure:**
```
1. Stop all Workers (to prevent writes)
2. Download backup from R2
3. Create new D1 instance
4. Import backup data
5. Run integrity checks
6. Update Worker bindings
7. Restart Workers
8. Verify health checks
9. Monitor for errors
10. Notify users if > 1 hour downtime
```

### Disaster Scenarios

**Scenario 1: Database Corruption**
```
RTO: 30 minutes
RPO: 1 hour (last backup)
Action:
  1. Detect via health checks
  2. Switch to backup D1
  3. Restore from previous backup
  4. Verify data integrity
  5. Notify affected players (if any active games)
```

**Scenario 2: Worker Code Bug**
```
RTO: 5 minutes
RPO: Immediate (no data loss)
Action:
  1. Revert to previous deployment
  2. Redeploy via GitHub Actions
  3. Monitor error rates
  4. Notify team
```

**Scenario 3: DDoS Attack**
```
RTO: Automatic
RPO: N/A
Action:
  1. Cloudflare automatically mitigates
  2. Increase rate limiting
  3. Enable WAF rules
  4. Block attacking IPs
  5. Monitor traffic patterns
```

**Scenario 4: Major Incident (All Services Down)**
```
RTO: < 1 minute
RPO: N/A (stateless frontend)
Action:
  1. Status page: post incident notice
  2. Notify team via Slack
  3. Restore from backups
  4. Run full test suite
  5. Post-incident review
  6. Update runbooks
```

### Incident Response

**Classification:**
- 🔴 **CRITICAL**: Users completely blocked, data at risk
- 🟠 **HIGH**: Major functionality broken
- 🟡 **MEDIUM**: Partial functionality issues
- 🟢 **LOW**: Minor issues, cosmetic bugs

**Response Time:**
```
Critical: Alert within 1 minute, resolve within 30 minutes
High: Alert within 5 minutes, resolve within 2 hours
Medium: Alert within 30 minutes, resolve within 24 hours
Low: Log and prioritize in backlog
```

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Domain registered and pointed to Cloudflare
- [ ] Cloudflare Workers created (prod + testing)
- [ ] D1 databases created with schema
- [ ] KV namespaces created
- [ ] R2 buckets created and configured
- [ ] Durable Objects class created
- [ ] GitHub Actions secrets configured
- [ ] SSL/TLS certificates verified
- [ ] Health check endpoint working
- [ ] Monitoring dashboard set up

### Phase 2: Backend API (Week 2-3)

- [ ] Authentication endpoints implemented
- [ ] User registration/login working
- [ ] JWT token generation/validation
- [ ] Password hashing with bcrypt
- [ ] Rate limiting implemented
- [ ] Database queries optimized
- [ ] Error handling standardized
- [ ] Logging configured
- [ ] API documentation written
- [ ] API tests passing (90%+ coverage)

### Phase 3: Frontend (Week 3-4)

- [ ] React project scaffolded
- [ ] UI components created
- [ ] State management (Zustand) configured
- [ ] API integration completed
- [ ] Authentication flow working
- [ ] Responsive design verified
- [ ] Accessibility audit passed
- [ ] Performance optimized (Lighthouse >90)
- [ ] Service Worker configured
- [ ] E2E tests written

### Phase 4: Game Engine (Week 4-5)

- [ ] Monopoly game logic implemented
- [ ] Board rendering (Pixi.js)
- [ ] Game state management
- [ ] Turn flow working
- [ ] Dice mechanics
- [ ] Property trading system
- [ ] Jail mechanics
- [ ] Win conditions verified
- [ ] Game tests passing
- [ ] Performance benchmarks met

### Phase 5: Multiplayer (Week 5-6)

- [ ] WebSocket connections working
- [ ] Durable Objects class implemented
- [ ] Real-time state sync
- [ ] Player join/leave handling
- [ ] Network latency handling
- [ ] Reconnection logic
- [ ] Game timeout handling
- [ ] Multiplayer tests passing
- [ ] Load testing completed
- [ ] Network failover tested

### Phase 6: Security & Compliance (Week 6-7)

- [ ] Security headers configured
- [ ] CORS properly scoped
- [ ] Input validation everywhere
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified
- [ ] CSRF protection implemented
- [ ] Rate limiting tested
- [ ] GDPR compliance implemented
- [ ] CCPA compliance implemented
- [ ] Security audit completed

### Phase 7: Testing & QA (Week 7-8)

- [ ] Unit tests written (80%+ coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Load testing (1000 concurrent users)
- [ ] Security penetration testing
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance audit (Core Web Vitals)
- [ ] SEO audit completed
- [ ] Mobile responsiveness verified
- [ ] Browser compatibility tested

### Phase 8: Deployment (Week 8)

- [ ] Deployment runbook created
- [ ] CI/CD pipeline working
- [ ] Smoke tests passing
- [ ] Rollback procedure tested
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Incident response plan ready
- [ ] Team trained on procedures
- [ ] Documentation completed
- [ ] Launch checklist signed off

---

## Appendices

### A. Environment Variables

**Production (.env.production)**
```
ENVIRONMENT=production
API_URL=https://api.boardgamesepic.com
FRONTEND_URL=https://www.boardgamesepic.com
JWT_SECRET=<generated-secret>
CLOUDFLARE_ACCOUNT_ID=05607df215f6fbb6d85e742ca0e6bc59
```

**Testing (.env.testing)**
```
ENVIRONMENT=testing
API_URL=https://test-api.boardgamesepic.com
FRONTEND_URL=https://test.boardgamesepic.com
JWT_SECRET=<generated-secret>
CLOUDFLARE_ACCOUNT_ID=05607df215f6fbb6d85e742ca0e6bc59
```

**Development (.env.local)**
```
ENVIRONMENT=development
API_URL=http://localhost:8787
FRONTEND_URL=http://localhost:5173
JWT_SECRET=dev-secret-key
```

### B. CLI Commands

**Deploy to Production:**
```bash
npm run build
npm run deploy
```

**Deploy to Testing:**
```bash
npm run build
wrangler deploy --env testing
```

**Local Development:**
```bash
npm run dev
```

**Database Operations:**
```bash
# Backup production
wrangler d1 execute boardgames-prod --command "VACUUM"

# Restore from backup
wrangler d1 execute boardgames-prod --file backup.sql

# List databases
wrangler d1 list
```

**KV Operations:**
```bash
# Purge cache
wrangler kv:key delete --namespace-id=<id> "*" --path=""

# List keys
wrangler kv:key list --namespace-id=<id>
```

### C. Related Documents

- [INSTRUCTIONS.md](../INSTRUCTIONS.md) - Project requirements and specifications
- [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) - Step-by-step Cloudflare configuration
- [SECURITY.md](./SECURITY.md) - Security guidelines and best practices
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - REST API endpoint reference
- [GAME_RULES.md](./GAME_RULES.md) - Monopoly game rules and mechanics

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-07  
**Maintained By:** Development Team  
**Status:** 🚀 Ready for Implementation
