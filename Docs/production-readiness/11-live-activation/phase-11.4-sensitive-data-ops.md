# Phase 11.4 — Sensitive-data operations

## Goal
Prove real private storage, scanning, deletion and export operations before accepting sensitive user data.

## Required scenarios
Consent → signed private upload → malware scan → approval eligibility; malicious-file quarantine; expired grant rejection; consent withdrawal; account deletion worker; storage sweep; export generation; deleted items excluded from datasets/licensing.

## Exit gate
Live storage/scanner/worker run evidence is PASS and alerting is verified.