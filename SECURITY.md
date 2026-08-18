# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 2.0.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

Only the latest release on the `main` branch receives security updates.

## Reporting a Vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report vulnerabilities privately by emailing the maintainers or opening a
[security advisory](https://github.com/MateeRixx/Fredy/security/advisories/new)
on GitHub.

Please include:

- The affected version
- A description of the vulnerability
- Steps to reproduce (or a proof-of-concept)
- Any suggested fix, if you have one

We will acknowledge receipt within 48 hours and aim to triage within a week.

## Security Notes for This Project

This project is a **demonstration/educational system**. It is not designed to
handle real cardholder data. Do NOT deploy it with production payment data
without:

- Role-based access control
- TLS in front of the service
- Secrets management (never commit `.env`)
- Dataset encryption at rest
- Compliance review (PCI-DSS, GDPR) by qualified personnel