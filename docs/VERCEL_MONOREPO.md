# Vercel + Git monorepo

Repository: https://github.com/keval65-modal/thru-platform

## Root Directory (Vercel dashboard → Settings → General)

| Vercel project | Root directory |
|--------------|----------------|
| `thru-vendor-dashboard` | `FirebaseImports/thru-vendor-firebase-main/thru-vendor-firebase-main` |
| `thru-user-app29082025-master` | `FirebaseImports/thru-user-app29082025-master/thru-user-app29082025-master` |
| `thru-landing` | `FirebaseImports/thru-landing` |

Connect each project to the **same** GitHub repo and branch (`main`). Set **Ignored Build Step** per project to only build when that folder changes (see main README).

## CLI deploy (from app folder)

```powershell
# Vendor
Set-Location FirebaseImports\thru-vendor-firebase-main\thru-vendor-firebase-main
npx vercel link --yes --scope keval65-modals-projects --project thru-vendor-dashboard
npx vercel --prod --yes --scope keval65-modals-projects

# User app
Set-Location FirebaseImports\thru-user-app29082025-master\thru-user-app29082025-master
npx vercel link --yes --scope keval65-modals-projects --project thru-user-app29082025-master
npx vercel --prod --yes --scope keval65-modals-projects

# Landing
Set-Location FirebaseImports\thru-landing
npx vercel link --yes --scope keval65-modals-projects --project thru-landing
npx vercel --prod --yes --scope keval65-modals-projects
```

## Production domains

| Project | Domain |
|---------|--------|
| Vendor | https://merchant.kiptech.in |
| User app | https://app.kiptech.in |
| Landing | https://thru.kiptech.in |
