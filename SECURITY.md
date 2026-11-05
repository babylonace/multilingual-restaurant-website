# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Use GitHub's private reporting instead: open the **Security** tab of this repository and choose **Report a vulnerability**. Include what you found, the steps to reproduce it and, if you can, what an attacker could do with it.

This is a one-person project, so replies are best effort. You will get an answer in the same private thread, and a fix is published before the details are.

## What is in scope

- The code in this repository: the pages, the build scripts and the workers.
- The CI configuration in `.github/`.

## What is not

- The business data of the restaurant this site was built for. It is not part of this repository.
- Problems in Astro, Cloudflare, GitHub or a browser themselves. Report those to their owners.

## How changes are checked

Every change goes through a pull request. Formatting, lint, types, unit tests, browser and accessibility tests and a mobile Lighthouse run must pass before it reaches `main`. CI actions are pinned to commit hashes and Dependabot proposes updates weekly. Secret scanning and push protection are on. This repository holds no deploy credentials.
