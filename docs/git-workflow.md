# Git Workflow (Issue -> Stage -> Main)

This workflow keeps history clean and avoids large noisy commit lists in `main`.

## Branch Model

- `main`: production-ready history
- `feature/stage-2-tags-ai`: integration branch for Stage 2
- `feature/issue-XX-*`: one branch per issue

## Golden Rules

- Always branch issues from `feature/stage-2-tags-ai`.
- Sync issue branches with `rebase` (not merge).
- PR `issue -> stage`: use **Squash and merge**.
- PR `stage -> main`: use **Squash and merge** (if you want a clean main history).
- Do not use GitHub "Update branch" if it creates a merge commit.

## One-Time Git Setup

```bash
git config --global pull.ff only
git config --global rebase.autoStash true
```

## Daily Flow

### 1) Start an issue branch

```bash
git checkout feature/stage-2-tags-ai
git pull --ff-only
git checkout -b feature/issue-14-short-name
```

### 2) Work and commit normally

```bash
git add .
git commit -m "feat(issue-14): implement X"
```

### 3) Sync before push/PR (rebase, not merge)

```bash
git fetch origin
git rebase origin/feature/stage-2-tags-ai
```

If conflicts appear:

```bash
# fix files
git add .
git rebase --continue
```

### 4) Push

```bash
git push -u origin feature/issue-14-short-name
```

If branch was already pushed and rebased:

```bash
git push --force-with-lease
```

### 5) Open PR: `feature/issue-14-short-name` -> `feature/stage-2-tags-ai`

- Merge method: **Squash and merge**
- Suggested squash commit title:

```text
feat(issue-14): short summary
```

## Stage to Main Release

After all issue PRs are merged into stage:

1. Open PR `feature/stage-2-tags-ai` -> `main`
2. Use **Squash and merge** for one clean release commit in `main`
3. Include summary + validation commands in PR description

## What to Avoid

- Merging `stage` into issue branches repeatedly
- Merge commits in issue PRs when not needed
- Force pushing shared integration branches
- Mixing multiple issues in one issue branch
