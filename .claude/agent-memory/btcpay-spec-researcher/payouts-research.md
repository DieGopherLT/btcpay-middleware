---
name: payouts-investigation-2026-05-18
description: Payout endpoint schema, approval flow, pullPaymentId optionality, and webhook events for automated processor workflow
metadata:
  type: reference
---

## Payout Endpoint & Schema

**Question:** Does POST /api/v1/stores/{storeId}/payouts accept `pullPaymentId` omitted + `approved: true` in one call?

**Finding:** UNCLEAR/NOT EXPLICITLY DOCUMENTED.

- Official docs describe payout as part of pull payment workflow, but do not explicitly confirm whether `pullPaymentId` can be omitted when `approved: true` is set.
- BTCPay 1.5.0+ introduced payout processors; docs emphasize that payouts can be auto-processed once approved, but does not clarify the schema optionality.
- GitHub issue #2097 ("Create A Payout post missing requestBody properties") indicates ongoing API schema documentation gaps.
- **Recommendation:** Query the local swagger.json spec directly or test against a live instance to confirm pullPaymentId field requirements.

**Source:** [BTCPay Blog 1.5.0](https://blog.btcpayserver.org/btcpay-server-1-5-0/), [GitHub issue #2097](https://github.com/btcpayserver/btcpayserver/issues/2097)

## Payout States

**Confirmed states (from docs):**
- "Awaiting Approval" (initial)
- "In Progress" (after approval/signing)
- "Completed" (after on-chain confirmation)

**Behavior:** Once approved via API with `approved: true`, payout should move to "In Progress" state and be eligible for processor pickup. No intermediate step documented.

**Source:** [Payouts | BTCPay](https://docs.btcpayserver.org/Payouts/)

## API Key Scopes

**Finding:** Documentation references `btcpay.store.canmanagepayouts` permission, but this is inferred, not explicitly listed in public docs.

- Greenfield authorization system supports scoped API keys.
- Specific scope names for payouts not exhaustively documented in public materials.

**Source:** [Greenfield Authorization MD](https://github.com/btcpayserver/btcpayserver/blob/master/docs/greenfield-authorization.md), [BTCPay Greenfield Development](https://docs.btcpayserver.org/BTCPayServer/greenfield-development/)

## Payout Webhook Events

**Confirmed event types (from docs):**
1. `PayoutCreated`
2. `PayoutApproved`
3. `PayoutCancelled`
4. `PayoutTransactionConfirmed`

**End-to-end flow (auto-approved + processor sends):**
- `PayoutCreated` → fires when payout initially created
- `PayoutApproved` → fires when approved (either manually or via `approved: true` in POST)
- (Processor picks up and broadcasts)
- `PayoutTransactionConfirmed` → fires when transaction confirmed on-chain

**IMPORTANT:** There is NO documented event that explicitly signals "transaction emitted by processor" vs. "awaiting processor" — this is a potential gap. `PayoutTransactionConfirmed` implies the tx was sent and confirmed, but intermediate state (tx sent but not yet confirmed) is not clearly surfaced via webhook.

**Payload fields:** NOT documented in public sources for payouts (unlike invoices). Likely includes payoutId, state, amount, transactionId (on confirmation). **Needs verification.**

**Source:** [BTCPay Webhooks (v1)](https://docs.btcpayserver.org/API/Greenfield/v1/#tag/Webhooks)

## Automated Processor Behavior

**Confirmed:** 
- Payout processors discriminate based on paymentMethod (BTC-CHAIN, BOLT11, LNURL).
- Processor picks up payouts in "Awaiting Payment" (awaiting processor pickup) state.
- Batches them at configurable intervals and broadcasts.
- Does NOT automatically approve by default (requires `approved: true` in API call or manual UI approval).

**No documented difference in processor behavior** for payouts with vs. without pullPaymentId origin.

**Source:** [BTCPay Blog 1.5.0](https://blog.btcpayserver.org/btcpay-server-1-5-0/), [Payouts | BTCPay](https://docs.btcpayserver.org/Payouts/)

## Gaps Identified

1. **pullPaymentId optionality:** Not explicitly documented; must verify against swagger or live instance.
2. **Webhook payload schema:** Not documented for payouts (only inferred from invoice webhooks).
3. **Processor discrimination:** No docs explicitly stating whether processor behavior differs for payouts created with vs. without pull payment context.
4. **Intermediate transaction state:** No webhook event for "tx sent but not yet confirmed" — only PayoutTransactionConfirmed.
