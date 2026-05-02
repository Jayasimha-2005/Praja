# Praja — AI Voice FIR Assistant

Minimal repo README. For publishing:

- Do NOT commit any secrets (`.env`, private keys, certs).
- Copy `config/.env.example` to `config/.env` and fill your keys locally.

Local dev quickstart:

```bash
# Backend
cd backend
python -m venv .venv
.venv/Scripts/activate   # Windows
pip install -r requirements.txt
python server.py

# Frontend
cd frontend
npm install
npm run dev
```

If sensitive files were committed, see `HISTORY_CLEANUP.md` for removal steps.

That's all — this README contains only the essentials for publishing.

## ⚠️ Before Making This Repo Public

- Ensure no `.env` or credential files are committed. `.gitignore` already excludes `.env` and `config/.env`.
- Keep `config/.env.example` in the repo and copy it to `config/.env` (do not commit the latter).
- Scan the repo and history for secrets before publishing. Example commands:

```bash
# list files that look like env files
git ls-files | grep -i "\.env" || true

# search working tree for likely keys
git grep -n "API_KEY\|SECRET\|TOKEN" || true

# if a secret was committed, remove it from history (use carefully):
# Install and use git-filter-repo or BFG; example (git-filter-repo is recommended):
# pip install git-filter-repo
# git-filter-repo --invert-paths --paths config/.env
```

- Rotate any keys if they were exposed and avoid reusing them.
- Consider running `git-secrets` or similar scanning tools in CI to prevent future commits with secrets.
