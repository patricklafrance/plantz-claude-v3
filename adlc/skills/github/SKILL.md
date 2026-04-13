---
name: github
description: |
    Fetch data from GitHub using the gh CLI. Use when the gather agent needs to
    retrieve issues or PR-linked issues from GitHub as a project management source.
---

# GitHub

Fetch issues and PR data from GitHub using the `gh` CLI.

## Fetching a single issue

```bash
gh issue view <N> --json title,body,number
```

## Fetching issues linked to a PR

```bash
gh issue list --label adlc-fix --state open --json number,title,body,labels
```

Filter the results to issues whose `body` contains `#<pr-number>` or the full PR URL.

## Output template

Write one block per issue, separated by blank lines:

```
Issue #<number>: <title>
Link: <issue URL from gh output>

<body>
```

## Rules

- Include image URLs as-is in the output — do not attempt to download or process images.
- Do not modify or summarize issue content — copy it faithfully.
