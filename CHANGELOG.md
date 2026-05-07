# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-05-07

Initial alpha release.

### Added

- `BTCPayMiddleware.configure()` singleton with env-var fallback (`BTCPAY_BASE_URL`, `BTCPAY_API_KEY`, `BTCPAY_STORE_ID`, `BTCPAY_WEBHOOK_SECRET`).
- `createInvoice` middleware: maps `(amount, currency, orderId?, buyerEmail?, description?, checkout?, metadata?)` -> `POST /api/v1/stores/{storeId}/invoices`.
- `getInvoice` middleware: `GET /api/v1/stores/{storeId}/invoices/{invoiceId}` for reconciliation.
- `invoiceWebhook` middleware with first-class HMAC-SHA256 verification of `BTCPay-Sig` header. Dispatches by event type to `onCreated`, `onReceivedPayment`, `onProcessing`, `onSettled`, `onPaymentSettled`, `onExpired`, `onInvalid`.
- `BTCPayClient` HTTP client (axios + interceptors) using `Authorization: token <apiKey>`.
- Error hierarchy: `BTCPayError` -> `BTCPayApiError` / `BTCPayConfigError` / `BTCPayValidationError` / `BTCPayNetworkError` / `BTCPayWebhookSignatureError`.
- Public `verifyWebhookSignature` / `computeSignature` utilities.
- `res.locals.btcpayResponse` namespace for coexistence with `@taloon/nowpayments-middleware`.
