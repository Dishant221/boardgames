# BoardGamesEpic.com - Production Instructions

**Project Scope:** Multiplayer web-based board games platform with Monopoly as the first game.
**Domain:** www.boardgamesepic.com
**Budget Constraint:** Cloudflare Free Tier only
**Architecture:** Client-side heavy multiplayer (WebSockets via Cloudflare)

---

## 1. PROJECT OVERVIEW

### Vision
Build a nostalgic, engaging multiplayer board games platform where users can:
- Create accounts and authenticate securely
- Play multiple classic and modern board games
- Experience 2D games with 3D asset effects
- Enjoy smooth, animated UI/UX with sound design
- Compete with friends in real-time multiplayer sessions

### Target Experience
- Evoke childhood memories and nostalgia
- Smooth, fluid animations throughout
- Immersive sound design and background music
- Professional visual polish with 3D-like effects
- Fully responsive and accessible design

---

## 2. TECHNOLOGY STACK

### Frontend
- **Framework:** React 18+ (TypeScript)
- **State Management:** Redux Toolkit or Zustand
- **Graphics:** Canvas API / Pixi.js (lightweight 2D rendering)
- **3D Effects:** Three.js (minimal, optimized for 2D games)
- **WebSockets:** Socket.io (client-side)
- **UI/UX:** Tailwind CSS + Framer Motion (animations)
- **Audio:** Web Audio API / Howler.js
- **Build Tool:** Vite

### Backend / Infrastructure
- **Deployment:** Cloudflare Workers (serverless)
- **Database:** Cloudflare D1 (SQLite) OR Durable Objects (if needed)
- **Real-time Multiplayer:** Cloudflare Durable Objects + WebSockets
- **CDN:** Cloudflare (automatic)
- **Email:** Cloudflare Email Service (if needed)
- **Static Assets:** Cloudflare R2 (Object Storage) - FREE tier
- **Authentication:** Custom JWT tokens (stored securely, client-side encrypted)
- **SSL/TLS:** Cloudflare (automatic)

### Version Control
- **Repository:** GitHub
- **Branches:** 
  - `main` (Production - www.boardgamesepic.com)
  - `testing` (Staging - test.boardgamesepic.com)
- **Deployment:** GitHub Actions → Cloudflare Workers

### Workers Setup
- **Worker 1:** Production (prod.boardgamesepic.com)
  - Handles all production traffic
  - Database: Cloudflare D1 (Production)
  - Durable Objects: Production namespace
  
- **Worker 2:** Testing/Staging (test.boardgamesepic.com)
  - Testing and QA
  - Database: Cloudflare D1 (Testing)
  - Durable Objects: Testing namespace

---

## 3. ARCHITECTURE & SECURITY

### Authentication & Authorization
- **Method:** JWT (JSON Web Tokens)
- **Storage:** Secure HTTP-only cookies (encrypted)
- **Refresh Tokens:** Stored in Durable Objects (server-side)
- **Password Hashing:** Argon2 or bcrypt (Cloudflare Workers)
- **2FA:** Optional, using TOTP (Time-based One-Time Password)
- **OAuth2:** GitHub/Google (optional future feature)

### Data Security
- **Database Encryption:** All sensitive data encrypted at rest (D1)
- **HTTPS Only:** Enforced redirect from HTTP
- **CSP Headers:** Content Security Policy headers on all responses
- **CORS:** Strict origin validation
- **Input Validation:** Client-side + Server-side (server-side is authoritative)
- **SQL Injection Prevention:** Use parameterized queries only
- **XSS Prevention:** Sanitize all user inputs, use framework defaults
- **CSRF Prevention:** SameSite cookies + CSRF tokens

### Client-Side Security
- **No API Keys in Frontend:** All keys stored server-side
- **Secure WebSocket Connections:** WSS (WebSocket Secure)
- **Game State Validation:** All game moves validated server-side
- **Rate Limiting:** Implement on Cloudflare Workers
- **DDoS Protection:** Cloudflare DDoS mitigation (automatic)

### Compliance & Standards
- **GDPR:** User data privacy controls, right to delete
- **CCPA:** California privacy rights compliance
- **Accessibility:** WCAG 2.1 AA compliance
- **SEO:** Structured data (Schema.org), meta tags, sitemaps
- **Google Standards:** Mobile-friendly, Core Web Vitals optimization
- **Children's Safety:** If allowing users <13, COPPA compliance
- **Terms of Service & Privacy Policy:** Clear, transparent documentation

---

## 4. GAME ARCHITECTURE - MONOPOLY (FIRST GAME)

### Game State Schema
```json
{
  "gameId": "string (unique game session ID)",
  "status": "waiting|playing|completed",
  "players": [
    {
      "userId": "string",
      "username": "string",
      "color": "string",
      "position": "number (0-39)",
      "money": "number",
      "properties": ["number"],
      "jailedTurns": "number",
      "status": "active|bankrupt|winner"
    }
  ],
  "board": {
    "properties": [{ "id": "number", "owner": "userId|null", "houses": "number", "hotels": "number", "mortgaged": "boolean" }],
    "freeParking": "number",
    "communityChest": ["card"],
    "chance": ["card"]
  },
  "currentPlayerIndex": "number",
  "diceRolls": ["number", "number"],
  "turnHistory": ["action"],
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Game Logic (Server-Side Validation)
- **Turn Cycle:** Roll dice → Move → Action (buy/pass/mortgage) → Next player
- **Dice Mechanics:** Fair random generation server-side, client-side display only
- **Property System:** Purchase, mortgage, unmortgage, house/hotel logic
- **Income System:** Go salary, rent collection, tax payment
- **Card System:** Chance & Community Chest cards (17 each)
- **Jail System:** 3 options to get out (roll doubles, pay $50, use card)
- **Win Condition:** Last player with money > 0 or > $500
- **Multiplayer Sync:** Real-time updates via Durable Objects

### Visual & Audio Design
- **2D Board Rendering:** Canvas API or Pixi.js (optimized)
- **3D Asset Effects:** Three.js for property cards, money stacks, player tokens (subtle)
- **Animations:** 
  - Dice roll animation (0.5s)
  - Token movement along board (1.5s)
  - Property purchase pop-up (0.3s entrance)
  - Money transaction animations (0.2s)
  - Card draw animations (0.4s)
  - Victory celebration animation (custom)
- **Sound Design:**
  - Background music (loop, royalty-free)
  - Dice roll sound (satisfying SFX)
  - Property purchase sound (positive feedback)
  - Token movement (subtle footstep/slide SFX)
  - Victory fanfare (celebratory)
  - UI interaction sounds (button clicks, hovers)
- **Nostalgic Theme:**
  - Retro board design (with modern polish)
  - Classic Monopoly colors and fonts
  - Warm, inviting color palette
  - Childhood-inspired UI elements

---

## 5. CLOUDFLARE OPTIMIZATION (FREE TIER)

### Services to Utilize
1. **Cloudflare Workers** (Free tier: 100k requests/day)
   - API endpoints
   - Server-side validation
   - Real-time multiplayer logic (Durable Objects)

2. **Durable Objects** (Free tier: 3 objects, 1 million requests/month)
   - Game session state management
   - Real-time WebSocket connections for multiplayer
   - One object per active game session

3. **Cloudflare D1** (Free tier: 3 databases)
   - Production database
   - Testing database
   - Analytics/logging database

4. **Cloudflare R2** (Free tier: 10GB/month egress)
   - Game assets (images, sprites, backgrounds)
   - Sound files
   - 3D models (small .gltf files)

5. **Cloudflare KV** (Free tier: 100k write/1M read/month)
   - Game cache (session data, player stats)
   - Leaderboard (read-heavy)
   - Rate limiting counters

6. **Cloudflare Pages** (Free tier: unlimited)
   - Static site hosting (React build output)
   - Auto-deployment from GitHub
   - Edge caching

7. **Cloudflare Email Routing** (Free tier: unlimited)
   - Password reset emails
   - Account notifications
   - Transactional emails

### Cost Optimization Strategy
- **Client-Side Heavy:** Most game logic on client (reduces Worker compute)
- **Durable Objects:** Only for real-time sync, not persistent storage
- **D1 for Persistence:** User accounts, game history, leaderboards
- **KV for Caching:** Cache D1 results to reduce database hits
- **R2 for Assets:** Store all static assets (images, audio, 3D models)
- **Workers Rate Limiting:** Prevent abuse, reduce unnecessary requests
- **Image Optimization:** WebP format, responsive images, lazy loading

---

## 6. USER FLOW

### Onboarding
1. Landing page → Sign Up / Log In
2. Email verification (Cloudflare Email)
3. Complete profile (username, avatar, preferences)
4. Tutorial (how to play Monopoly)
5. Dashboard (available games, past games, leaderboard)

### Playing a Game
1. Create new game or join existing lobby
2. Wait for 2-4 players to join
3. Game starts → Dice roll → Move → Actions
4. Real-time notifications (turn alerts, property purchases)
5. Game ends → Results screen → Leaderboard update

### Post-Game
1. Statistics (money earned, properties owned, turns played)
2. Share results (optional social sharing)
3. Return to dashboard
4. Replay or play different game

---

## 7. FUTURE FEATURES (ROADMAP)

### Phase 2
- Additional classic games: Chess, Checkers, Scrabble
- Custom game rules and variants
- Friends list and direct invitations
- Achievement system and badges

### Phase 3
- Mobile app (React Native)
- Voice chat (via WebRTC)
- Tournament mode (brackets, seasons)
- Cosmetics and customization (player skins, boards)

### Phase 4
- AI opponents
- Game monetization (cosmetics, battle pass)
- Streaming integration (Twitch drops)
- API for game developers (custom game hosting)

---

## 8. DEPLOYMENT PIPELINE

### GitHub Branches
```
main (Production)
  ↓ (approved PR)
testing (Staging)
  ↓ (feature branches)
feature/* (Development)
```

### CI/CD Pipeline
1. **Push to feature branch** → GitHub Actions workflow triggers
2. **Run tests** → Linting, unit tests, integration tests
3. **Build check** → Vite build success
4. **Deploy to testing worker** → test.boardgamesepic.com
5. **PR review & approval**
6. **Merge to testing** → Auto-deploy to testing worker
7. **Manual promotion to main** → Deploy to prod.boardgamesepic.com

### Deployment Checklist
- [ ] All tests passing
- [ ] No security vulnerabilities (npm audit)
- [ ] Performance benchmarks met (Lighthouse >90)
- [ ] SEO audit passed
- [ ] Accessibility audit passed (axe DevTools)
- [ ] Database migrations applied
- [ ] Cloudflare Workers updated
- [ ] CDN cache invalidated
- [ ] Monitoring and logging configured

---

## 9. DATABASE SCHEMA (CLOUDFLARE D1)

### Users Table
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  last_login DATETIME,
  is_active BOOLEAN DEFAULT true
);
```

### Game Sessions Table
```sql
CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY,
  game_type TEXT NOT NULL, -- 'monopoly', etc.
  status TEXT NOT NULL, -- 'waiting', 'playing', 'completed'
  players TEXT NOT NULL, -- JSON array of player objects
  board_state TEXT NOT NULL, -- JSON game state
  created_at DATETIME,
  started_at DATETIME,
  ended_at DATETIME,
  winner_id TEXT
);
```

### Player Stats Table
```sql
CREATE TABLE player_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_money_earned INTEGER DEFAULT 0,
  favorite_game TEXT,
  created_at DATETIME,
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Leaderboard Table
```sql
CREATE TABLE leaderboard (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  wins INTEGER DEFAULT 0,
  rank INTEGER,
  score INTEGER,
  updated_at DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 10. MONITORING & LOGGING

### Analytics to Track
- Daily active users (DAU)
- Game completion rate
- Average game duration
- Player churn rate
- Most played games
- Server errors and exceptions
- API response times
- Cloudflare usage metrics

### Logging Strategy
- **Workers Logs:** Cloudflare Logpush → D1 or external service
- **Client-Side Errors:** Send to server via error tracking API
- **Performance Metrics:** Web Vitals collection (CLS, LCP, FID)
- **User Sessions:** Track login, logout, game events

### Alerting
- Critical errors → Slack notification
- High error rate (>5% of requests) → Alert
- Database connection failures → Alert
- Worker timeout → Alert

---

## 11. SECURITY CHECKLIST

### Frontend
- [ ] No API keys hardcoded (use Cloudflare environment variables)
- [ ] HTTPS enforcement (redirect HTTP)
- [ ] CSP headers configured
- [ ] CORS properly scoped
- [ ] Secure WebSocket (WSS)
- [ ] Input sanitization on all forms
- [ ] No localStorage for sensitive data (use HTTP-only cookies)
- [ ] Rate limiting on forms (prevent brute force)

### Backend (Workers)
- [ ] JWT token validation on every request
- [ ] Rate limiting per IP and per user
- [ ] Database query parameterization (no string concatenation)
- [ ] HTTPS enforcement
- [ ] Secure CORS headers
- [ ] User authorization checks (can player access this game?)
- [ ] Audit logging for sensitive operations
- [ ] Regular dependency updates

### Infrastructure
- [ ] Cloudflare DDoS protection enabled
- [ ] WAF (Web Application Firewall) rules configured
- [ ] Database backups automated (daily)
- [ ] Secrets management (Cloudflare Secrets)
- [ ] VPN/Private network for database access
- [ ] SSL certificate pinning (optional for mobile)
- [ ] Security headers (X-Frame-Options, X-Content-Type-Options, etc.)

---

## 12. SEO & PERFORMANCE OPTIMIZATION

### SEO Requirements
- [ ] Meta tags (title, description, keywords)
- [ ] Open Graph tags (social sharing)
- [ ] Structured data (Schema.org JSON-LD)
- [ ] Sitemap.xml
- [ ] robots.txt
- [ ] Mobile-friendly (responsive design)
- [ ] Fast page load (<3s)
- [ ] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [ ] Image optimization (WebP, lazy loading)
- [ ] Canonical URLs

### Performance Optimization
- [ ] Code splitting (lazy load game components)
- [ ] Asset minification (CSS, JS)
- [ ] Image compression (TinyPNG, ImageOptim)
- [ ] Gzip compression
- [ ] Browser caching (Cloudflare cache rules)
- [ ] Service Worker (offline support, PWA)
- [ ] Lighthouse score >90

---

## 13. DOCUMENTATION REQUIREMENTS

### To Be Created
1. **API Documentation** (OpenAPI/Swagger)
   - All Workers endpoints
   - Request/response formats
   - Error codes and messages

2. **Game Rules Document**
   - Monopoly rules (classic + house rules)
   - Turn flow diagram
   - Edge cases and resolution

3. **Architecture Decision Records (ADRs)**
   - Why Durable Objects vs. traditional backend
   - Why client-side heavy architecture
   - Security decisions

4. **Setup & Deployment Guide**
   - Local development setup
   - Cloudflare Workers setup
   - Database migrations
   - GitHub Actions configuration

5. **Security & Compliance Guide**
   - Data privacy policy
   - Terms of Service
   - GDPR compliance details
   - Security incident response

6. **Contributing Guidelines**
   - Code style guide
   - Pull request process
   - Testing requirements
   - Commit message format

---

## 14. CREDENTIALS & REQUIREMENTS NEEDED FROM USER

### Cloudflare
- [ ] Cloudflare Account ID
- [ ] Cloudflare API Token (with Workers, D1, R2, KV, Durable Objects permissions)
- [ ] Domain name ownership verified
- [ ] Nameservers updated to Cloudflare

### GitHub
- [ ] GitHub repository URL
- [ ] GitHub Personal Access Token (for CI/CD)
- [ ] GitHub Actions secrets configured

### Development Environment
- [ ] Node.js version to use (recommend 18+)
- [ ] Package manager (npm, yarn, pnpm)
- [ ] Git configuration

### Assets & Content
- [ ] Monopoly board sprites/images
- [ ] Game tokens/player pieces
- [ ] Dice images/3D models
- [ ] Sound files (background music, SFX)
- [ ] Property card designs
- [ ] Logo and branding guidelines
- [ ] Color palette (if custom branding desired)

### Game Configuration
- [ ] House rules for Monopoly (if any custom variants)
- [ ] Starting money amount
- [ ] Property prices (classic or custom)
- [ ] Game duration targets
- [ ] Max players per game

### Compliance & Legal
- [ ] Privacy Policy (template or custom)
- [ ] Terms of Service (template or custom)
- [ ] GDPR/CCPA consent forms ready
- [ ] Refund/cancellation policy (if applicable)

---

## 15. NEXT STEPS

1. **Confirm Credentials:** Provide Cloudflare Account ID, API Token, GitHub token
2. **Asset Collection:** Provide game sprites, sounds, images
3. **Project Setup:** Initialize repositories, configure GitHub Actions
4. **Environment Setup:** Create .wrangler configuration, D1 databases
5. **Backend Scaffolding:** Set up Workers, Durable Objects, database schema
6. **Frontend Scaffolding:** Initialize React project, Vite config
7. **Implementation:** Start with auth, then game engine, then UI
8. **Testing:** Unit tests, integration tests, E2E tests
9. **Deployment:** Deploy to testing worker, then production

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-07  
**Status:** Ready for Implementation
