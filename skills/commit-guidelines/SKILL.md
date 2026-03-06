---
name: Git Commit Guidelines
description: Standardized git commit messages following Conventional Commits specification for the Metai-Game project.
---

## Overview

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification to maintain a clean and readable commit history. This standardization helps in automated changelog generation and version management.

## Commit Message Format

Each commit message consists of a **header**, a **body**, and a **footer**. The header has a special format that includes a **type**, a **scope**, and a **subject**:

```text
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

## Quick Reference

### Types

The `<type>` must be one of the following:

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, etc)
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **perf**: A code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to our CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files
- **revert**: Reverts a previous commit

### Rules

- **Subject**: Use imperative, present tense: "change" not "changed" nor "changes". No dot at the end. Max 50 chars.
- **Body**: Motivation for the change and contrast with previous behavior. Wrap at 72 chars.
- **Footer**: Reference issues (e.g., `Closes #123`) or describe breaking changes.

## Examples

### Feature with Scope and Body

```text
feat(auth): add login functionality

Implement user login with email and password.
Support JWT token storage in local storage.

Closes #10
```

### Bug Fix

```text
fix(button): fix click event not firing

The button click event was blocked by the overlay element.
Added z-index to ensure button is clickable.
```

### Documentation Update

```text
docs: update README with installation instructions
```
