Replit local state archive
==========================

These Replit-specific local state files were moved/removed from the working tree to keep the repository clean.

If you need to restore them, retrieve the files from Git history or from your local backup.

Files removed:
- `.local/state/replit/agent/*`

Why removed:
- These files are Replit agent/local state files created by the Replit import/agent tooling and are not required for development or production deployments.

If you later want to re-enable Replit-specific docs or state, restore from Git history or copy files into `.local/state/replit/`.
