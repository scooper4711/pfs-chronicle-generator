# Security Policy

## Supported Versions

Only the latest release is supported with security updates.

| Version | Supported          |
|---------|--------------------|
| Latest  | :white_check_mark: |
| Older   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly.

**Do not open a public GitHub issue for security vulnerabilities.**

Instead, please use [GitHub's private vulnerability reporting](https://github.com/scooper4711/pfs-chronicle-generator/security/advisories/new) to submit your report. This ensures the issue can be assessed and addressed before public disclosure.

When reporting, please include:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fixes (optional)

## Response Timeline

- **Acknowledgment**: Within 72 hours of receiving the report
- **Assessment**: Within 1 week
- **Fix**: Depends on severity, but we aim to release patches promptly

## Scope

This module runs inside Foundry VTT's Chromium-based client. It:

- Reads and writes Foundry world settings and actor flags (local to the game world)
- Generates PDFs client-side using `pdf-lib`
- Copies session report data to the clipboard
- Fetches layout JSON and blank PDF files from the Foundry data directory

It does **not**:

- Make external network requests (except loading web fonts for PDF generation)
- Process user-uploaded files from untrusted sources
- Handle authentication or authorization (Foundry VTT manages this)
- Store or transmit personally identifiable information beyond PFS society numbers entered by the GM
