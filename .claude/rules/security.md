# Security Rules

ALL code changes in the repository.

## No Hardcoded Secrets

All sensitive data MUST use environment variables.

**Why:** Hardcoded secrets end up in git history, CI logs, and error traces, making them permanently extractable even after deletion.

```typescript
// TypeScript
❌ const apiKey = "sk-...";
❌ const password = "admin123";
❌ const databaseUrl = "postgres://user:pass@...";

✅ const apiKey = process.env.API_KEY;
✅ const password = process.env.DB_PASSWORD!;
✅ import 'dotenv/config';
```

```dart
// Dart
❌ final apiKey = 'sk-...';

✅ final apiKey = Platform.environment['API_KEY'];
✅ final apiKey = const String.fromEnvironment('API_KEY');
```

## Parameterized Queries

All database queries MUST use parameterized queries or ORM.

**Why:** Without parameterized queries, user input becomes executable SQL, enabling data theft, deletion, or privilege escalation.

```typescript
// TypeScript (Prisma / Drizzle ORM)
❌ db.query(`SELECT * FROM users WHERE id = ${userId}`)
❌ `DELETE FROM users WHERE name = '${name}'`

✅ db.user.findUnique({ where: { id: userId } })  // Prisma
✅ db.select().from(users).where(eq(users.id, userId))  // Drizzle
✅ db.query("SELECT * FROM users WHERE id = $1", [userId])  // parameterized
```

## Input Validation

All user input MUST be validated before use: type checking, length limits, format validation, whitelist when possible. Applies to API endpoints, CLI inputs, file uploads, form submissions.

**Why:** Unvalidated input is the entry point for injection attacks, buffer overflows, and type confusion across every attack surface.

## Output Encoding

All user-generated content MUST be encoded before display in HTML templates, JSON responses, and log output.

**Why:** Unencoded user content enables cross-site scripting (XSS), allowing attackers to execute arbitrary JavaScript in other users' browsers.

```
❌ element.innerHTML = userContent
❌ dangerouslySetInnerHTML={{ __html: userContent }}

✅ element.textContent = userContent
✅ DOMPurify.sanitize(userContent)
```

## MUST NOT

- **No eval() on user input**: `eval()`, `new Function(userInput)`, `child_process.exec(userInput)` (TS) / `Process.run(userInput)` (Dart) — BLOCKED

**Why:** `eval()` on user input is arbitrary code execution — the attacker runs whatever they want on the server/client.

- **No secrets in logs**: MUST NOT log passwords, tokens, or PII

**Why:** Log files are widely accessible (CI, monitoring, support staff) and rarely encrypted, turning every logged secret into a breach.

- **No .env in Git**: .env in .gitignore, use .env.example for templates

**Why:** Once committed, secrets persist in git history even after removal, and are exposed to anyone with repo access.

## Prism-Specific Security

- **Next.js**: Server Actions validate input with Zod, CSRF protection enabled, API routes authenticate
- **React**: No `dangerouslySetInnerHTML` with user content, sanitize all rendered data
- **Flutter**: Platform channel communication validated, no sensitive data in SharedPreferences without encryption
- **Tauri**: IPC commands validate all arguments, allowlist-only filesystem access, CSP headers configured

## Exceptions

Security exceptions require: written justification, security-reviewer approval, documentation, and time-limited remediation plan.
