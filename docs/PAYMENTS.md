## Payments Plan

### Providers
- Primary: Stripe (Payments + Connect for payouts)
- Optional: Adyen for enterprise accounts

### Capabilities
- Tokenize cards (PCI scope minimized via Elements/Hosted Fields)
- Auth/Capture flows per rate plan and policy
- Folio posting with taxes/fees; refunds and adjustments
- Virtual cards (OTAs) and offline payments support

### Ledgers & Accounting
- Guest folios, Group folios, AR ledgers
- Daily close and settlement reports
- Payouts to properties via Stripe Connect transfers

### Webhooks & Idempotency
- Provider webhooks → payment events → reconcile to folios
- Idempotency keys for all writes

