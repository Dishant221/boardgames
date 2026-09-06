# BoardGamesEpic.com

🎲 A nostalgic multiplayer board games platform built with modern web technologies.

**Website:** www.boardgamesepic.com

## Project Overview

BoardGamesEpic is a web-based platform where players can enjoy classic and modern board games in real-time multiplayer sessions. Built on Cloudflare's edge infrastructure for low-latency gaming experiences.

### Current Games
- **Monopoly** (v1.0) - Classic property trading game with 2D graphics and 3D asset effects

### Technology Stack
- **Frontend:** React 18 + TypeScript + Tailwind CSS + Framer Motion
- **Backend:** Cloudflare Workers + Durable Objects + D1
- **Deployment:** Cloudflare Pages + GitHub Actions
- **Real-time:** WebSockets via Durable Objects
- **Storage:** Cloudflare R2 (assets) + D1 (data)

## Project Structure

```
boardgames/
├── packages/
│   ├── frontend/          # React web application
│   ├── backend/           # Cloudflare Workers
│   └── shared/            # Shared types and utilities
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
├── docs/                  # Documentation
├── INSTRUCTIONS.md        # Complete project instructions
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- Git
- Cloudflare Account (Free tier)
- GitHub Account

### Development Setup

1. **Clone repository:**
   ```bash
   git clone git@github.com:Dishant221/boardgames.git
   cd boardgames
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd packages/frontend && npm install
   cd ../backend && npm install
   ```

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Run tests:**
   ```bash
   npm run test
   ```

## Documentation

- **[INSTRUCTIONS.md](./INSTRUCTIONS.md)** - Complete production instructions and specifications
- **[docs/](./docs/)** - Additional documentation (API, architecture, security)

## Branches

- **`main`** - Production branch (www.boardgamesepic.com)
- **`testing`** - Staging/QA branch (test.boardgamesepic.com)
- **`feature/*`** - Feature branches for development

## Deployment

### GitHub Actions CI/CD Pipeline
- Push to `feature/*` → Run tests on Testing Worker
- PR to `testing` → Deploy to test.boardgamesepic.com
- PR to `main` → Deploy to www.boardgamesepic.com (production)

### Deploy Commands
```bash
# Deploy to production (main)
npm run deploy

# Deploy to testing (testing branch)
# Automatic via GitHub Actions
```

## Security

- ✅ HTTPS only
- ✅ JWT authentication
- ✅ Server-side game state validation
- ✅ Rate limiting
- ✅ Input sanitization
- ✅ GDPR/CCPA compliant
- ✅ CSP headers enforced

See [docs/SECURITY.md](./docs/SECURITY.md) for detailed security guidelines.

## Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and test locally
3. Commit with clear message: `git commit -m "feat: description"`
4. Push to GitHub: `git push origin feature/your-feature`
5. Create Pull Request to `testing` branch
6. After review, PR to `main` for production

## Architecture

```
User Browser
    ↓
Cloudflare Pages (CDN)
    ↓
React Frontend
    ↓
WebSocket (WSS)
    ↓
Cloudflare Durable Objects (Real-time multiplayer)
    ↓
Cloudflare D1 (Database)
Cloudflare R2 (Assets)
```

## Roadmap

### Phase 1 (Current)
- ✅ Monopoly game
- ✅ Authentication (login/signup)
- ✅ Multiplayer real-time sync
- ✅ Game lobby

### Phase 2
- Additional games (Chess, Checkers, Scrabble)
- Friends list
- Achievement system
- Leaderboard improvements

### Phase 3
- Mobile app (React Native)
- Voice chat (WebRTC)
- Tournament mode
- Cosmetics/customization

## Support

For issues and questions:
1. Check existing GitHub issues
2. Create new issue with detailed description
3. Contact: dishant.totade@wisetechglobal.com

## License

MIT License - See LICENSE file for details

---

**Created:** 2026-09-07
**Status:** 🚀 In Development
