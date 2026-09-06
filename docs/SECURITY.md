# Security Guidelines

This document outlines security best practices and compliance requirements for BoardGamesEpic.

## Authentication & Authorization

- **JWT Tokens:** Used for session management
- **HTTP-Only Cookies:** Secure token storage
- **HTTPS Only:** All communications encrypted
- **Password Hashing:** Argon2 or bcrypt for password storage

## Data Security

- **Encryption at Rest:** Database encryption enabled
- **Encryption in Transit:** TLS 1.2+
- **Secure WebSockets:** WSS for real-time connections

## Client-Side Security

- No API keys in frontend code
- Input validation on all forms
- XSS prevention through sanitization
- CSRF token validation

## Server-Side Security

- Parameterized queries (no SQL injection)
- Rate limiting on all endpoints
- Server-side game state validation
- Audit logging for sensitive operations

## Compliance

- **GDPR:** User data privacy controls
- **CCPA:** California privacy compliance
- **WCAG 2.1 AA:** Accessibility standards
- **CSP Headers:** Content Security Policy enforced

## Incident Response

See [INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md) for procedures.

## Reporting Security Issues

To report security vulnerabilities:
1. **Do NOT** create public GitHub issues
2. Use GitHub's private security advisory feature
3. Include: Description, reproduction steps, impact assessment

We will respond within 24 hours.
