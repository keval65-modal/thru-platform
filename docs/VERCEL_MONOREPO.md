# Vercel + Git monorepo

Repository: https://github.com/keval65-modal/thru-platform  
Team: `keval65-modals-projects`

Configured via CLI (root directory, Git connect, ignored build steps).

## Projects

| Vercel project | Root directory | Production domain |
|----------------|----------------|-------------------|
| `thru-vendor-dashboard` | `FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main` | https://merchant.kiptech.in |
| `thru-user-app29082025-master` | `FirebaseImports/thru-user-app29082025-master/thru-user-app29082025-master` | https://app.kiptech.in |
| `thru-landing` | `FirebaseImports/thru-landing` | https://thru.kiptech.in |

All three are connected to the same GitHub repo (`keval65-modal/thru-platform`, branch `main`).

## Ignored build step (per project)

Only deploys when files under that app's root change:

- **Vendor:** `git diff HEAD^ HEAD --quiet -- FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main/`
- **User:** `git diff HEAD^ HEAD --quiet -- FirebaseImports/thru-user-app29082025-master/thru-user-app29082025-master/`
- **Landing:** `git diff HEAD^ HEAD --quiet -- FirebaseImports/thru-landing/`

## Manual CLI deploy (optional)

```powershell
# Vendor
Set-Location FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main
npx vercel --prod --yes --scope keval65-modals-projects

# User app
Set-Location FirebaseImports\thru-user-app29082025-master\thru-user-app29082025-master
npx vercel --prod --yes --scope keval65-modals-projects

# Landing
Set-Location FirebaseImports\thru-landing
npx vercel --prod --yes --scope keval65-modals-projects
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
