# Git push setup (keval65-modal)

Repository: https://github.com/keval65-modal/thru-platform

## What is configured on this PC

1. **HTTPS remote** (recommended, already working):
   ```
   https://github.com/keval65-modal/thru-platform.git
   ```
2. **Git Credential Manager** — signed in via `git credential-manager github login` as **keval65-modal**.
3. **Removed** stale credential for `impactxg-gnez` (Windows Credential Manager).
4. **SSH key** (optional backup) — private: `%USERPROFILE%\.ssh\id_ed25519_keval65`  
   Add the **public** key to https://github.com/settings/keys if you want SSH remotes later.

## Push from this machine

```powershell
Set-Location f:\thru
git add .
git commit -m "Your message"
git push
```

## Another PC

```powershell
git clone https://github.com/keval65-modal/thru-platform.git
cd thru-platform
```

Then run `git credential-manager github login` once (or use SSH after adding your key to GitHub).

## Switch to SSH remote (optional)

After adding `id_ed25519_keval65.pub` to GitHub → SSH keys:

```powershell
git remote set-url origin git@github.com:keval65-modal/thru-platform.git
ssh -T git@github.com   # should say: Hi keval65-modal!
git push
```

SSH config entry is in `%USERPROFILE%\.ssh\config` (Host `github.com`, IdentityFile `id_ed25519_keval65`).
