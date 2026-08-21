# Phase 8.8 — Certificates and Verification

## Goal
Make certificate downloads authentic, tamper-evident and independently verifiable.

## Implementation
- Issue certificate records only after verified course/assessment completion.
- Generate a PDF with unique certificate ID, issue date, learner/course and verification reference.
- Provide a public verification endpoint/page exposing only safe certificate facts.
- Support revocation/correction while preserving issuance history.
- Prevent guessed IDs from exposing private profile data.

## Tests / Evidence
- Incomplete learner cannot issue/download a certificate.
- Verification ID resolves valid/revoked/not-found correctly.
- PDF fields match authoritative certificate record.

## Exit gate
Every downloadable certificate has an authoritative issuance record and verifiable status.