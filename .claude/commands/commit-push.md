# Commit and Push Changes

Commit changes with a descriptive message and push to the remote repository.

## Steps:
1. Check git status to see all changes
2. Review git diff for staged and unstaged changes
3. Check recent commit history for commit style
4. Intelligently stage files:
   - Stage all modified tracked files
   - Stage new files that are relevant to the changes
   - **IGNORE these files/patterns:**
     - `.claude/settings.local.json` (local Claude settings)
     - `CLAUDE.md` (unless specifically updating project instructions)
     - `.env` and `.env.local` files (sensitive configuration)
     - `node_modules/` (dependencies)
     - Build outputs (`dist/`, `.next/`, `build/`)
     - IDE/editor files (`.vscode/`, `.idea/`)
     - OS files (`.DS_Store`, `Thumbs.db`)
     - Temporary files (`*.tmp`, `*.log`)
     - Lock files should only be staged if package changes were made
5. Create a descriptive commit message that:
   - Starts with a type prefix (feat:, fix:, chore:, docs:, style:, refactor:, test:, perf:)
   - Provides a clear summary in the first line (50 chars or less)
   - Lists key changes as bullet points
   - Adds Claude Code attribution
6. Push changes to the current branch's remote

## Important:
- Review all changes carefully before committing
- Ensure commit message accurately describes the changes
- Check that no sensitive information is being committed
- Verify the branch before pushing
- Ask user for confirmation if unsure about which files to include

## Files to Never Commit:
- Secrets, API keys, passwords
- Personal configuration files
- Large binary files (unless necessary)
- Generated files that can be rebuilt

## Usage:
Just type `/commit-push` or `/cp` and I'll handle the rest!