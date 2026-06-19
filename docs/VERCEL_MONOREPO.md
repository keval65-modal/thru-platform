# Vercel + Git monorepo

Repository: https://github.com/keval65-modal/thru-platform  
Team: `keval65-modals-projects`

Configured via CLI (root directory, Git connect, ignored build steps).

## Projects

| Vercel project | Root directory | Production domain |
|----------------|----------------|-------------------|
| `thru-vendor-dashboard` | `FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main` | https://merchant.kiptech.in |
| `thru-user-app29082025-master` | `FirebaseImports/thru-user-app29082025-master` | https://app.kiptech.in |
| `thru-landing` | `FirebaseImports/thru-landing` | https://thru.kiptech.in |

All three are connected to the same GitHub repo (`keval65-modal/thru-platform`, branch `main`).

## Ignored build step (per project)

Vercel **skips** the build when the command exits `0`, and **runs** it when the command exits `1`.

`git diff --quiet` exits `1` when files changed, `0` when unchanged — so only the app whose path changed should build:

- **Vendor:** `git diff HEAD^ HEAD --quiet -- FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main/`
- **User:** `git diff HEAD^ HEAD --quiet -- FirebaseImports/thru-user-app29082025-master/`
- **Landing:** `git diff HEAD^ HEAD --quiet -- FirebaseImports/thru-landing/`

If Git deploys stay **Canceled** (1s, no build), use Vercel env SHAs instead (per project, same path):

```bash
git diff --quiet $VERCEL_GIT_PREVIOUS_SHA $VERCEL_GIT_COMMIT_SHA -- FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main/
```

**If production shows old UI:** open Deployments — **Canceled** = skipped; the last **Ready** deployment is still live. User/landing may show a deployment row for every push even when only vendor code changed.

## Git pushes not creating deployments

If **no deployment rows appear** after pushing to `main`, the Vercel ↔ GitHub integration is likely disconnected.

1. **GitHub Actions (recommended):** Add repo secret `VERCEL_TOKEN` ([create token](https://vercel.com/account/tokens)), then pushes to `main` run `.github/workflows/vercel-production.yml`. You can also trigger it manually under **Actions → Vercel Production Deploy → Run workflow** (deploys all three apps).
2. **Reconnect Git in Vercel:** Project → Settings → Git → connect `keval65-modal/thru-platform`, branch `main`.
3. **Manual CLI** (from repo root, after `vercel login`):

## Manual CLI deploy (required when Git deploys are canceled)

Deploy from the **monorepo root** (`thru-platform`), not from inside the app folder (avoids doubled `rootDirectory` paths):

```powershell
# From repo root (F:\thru or clone root)
cd <repo-root>

# Vendor → merchant.kiptech.in
npx vercel deploy --prod --yes --scope keval65-modals-projects --project thru-vendor-dashboard

# User app → app.kiptech.in
npx vercel deploy --prod --yes --scope keval65-modals-projects --project thru-user-app29082025-master

# Landing → thru.kiptech.in
npx vercel deploy --prod --yes --scope keval65-modals-projects --project thru-landing
```

## Re-link / reconnect (if needed)

```powershell
$repo = "https://github.com/keval65-modal/thru-platform.git"

Set-Location FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main
npx vercel link --yes --scope keval65-modals-projects --project thru-vendor-dashboard
npx vercel git connect $repo --scope keval65-modals-projects
```

Repeat for the other two project folders with their project names.

## Update root directory via API

```powershell
npx vercel api "/v9/projects/<PROJECT_ID>" -X PATCH -F "rootDirectory=<path>" --scope keval65-modals-projects
```
