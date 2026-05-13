# BTCPay Middleware - Technical Guidelines

A TypeScript Express middleware library for BTCPay Server integration with dependency injection. Sibling to `@taloon/nowpayments-middleware`, intentionally separate because BTCPay's invoice-centric Greenfield API does not map cleanly onto NowPayments' deposit-address + payout flow.

## Quick Reference

- **README.md**: [README.md](README.md)
- **Build**: `pnpm run build`
- **Test**: `pnpm test` (with coverage: `pnpm test:coverage`)
- **Lint**: `pnpm run lint` (Prettier: `pnpm run format`)
- **Type Check**: `pnpm run type-check`
- **Docs**: MDX in `docs/`

## Architecture

```
src/
├── client/BTCPayClient.ts            # axios wrapper + Authorization: token <apiKey>
├── config/BTCPayConfig.ts            # singleton + reset() for tests
├── constants/statuses.ts             # InvoiceStatus + WebhookEventType enums
├── middlewares/
│   ├── base/BaseMiddleware.ts        # 3-tier handleError + saveToLocals
│   ├── webhooks/invoiceWebhook.ts    # HMAC verify + event dispatch
│   ├── createInvoice.ts
│   └── getInvoice.ts
├── types/                            # api.types, middleware.types, index
├── utils/
│   ├── errors.ts                     # BTCPayError + 5 subclasses
│   └── webhookSignature.ts           # HMAC SHA-256 (BTCPay-Sig)
└── index.ts                          # public API: BTCPayMiddleware namespace
```

## Patterns reused from nowpayments-middleware

- Higher-order middleware factory + module-level cache (with `resetX` exports for tests).
- Singleton config with `reset()` for testing.
- Custom error hierarchy (`BTCPayError` -> Api/Config/Validation/Network/WebhookSignature).
- Axios with response interceptors that convert all errors to typed errors.
- `BaseMiddleware.handleError` priority chain: per-middleware -> global config -> errorHandling mode.
- Path aliases `@/*` resolved at build time via `tsc-alias`.

## Intentional differences

1. **Invoice domain naming** (`createInvoice`, `invoiceWebhook`) — BTCPay organizes payment data under `paymentMethods` (per the Greenfield API). When `fetchPaymentMethods: true` is passed to `createInvoice`, the middleware fetches the invoice's payment methods and attaches them as `paymentMethods: BTCPayPaymentMethod[]` in `res.locals.btcpayResponse`. The library exposes the native BTCPay array; extracting `destination` (BTC address) or `amount` for a specific method (e.g., `BTC-CHAIN`) is the consumer's responsibility.
2. **HMAC webhook signature is first-class.** When `webhookSecret` is configured, `invoiceWebhook` verifies `BTCPay-Sig: sha256=<hex>` over the raw body. This requires `express.raw({ type: 'application/json' })` upstream.
3. **Client receives config explicitly** (`BTCPayClient.fromConfig(...)`) — no hidden coupling between client and singleton. The middlewares are the ones that read the singleton.
4. **`res.locals.btcpayResponse`** namespace, so this package can coexist with `@taloon/nowpayments-middleware` in the same app.
5. **No `auth/`, `decorators/RequiresAuth`, `totp.ts`, `dispersion/`** — BTCPay only needs a static API key.
6. **No payouts in v0.1.0.** BTCPay's pull-payments model is not equivalent to NowPayments' push payouts; if needed, they will be added later as `createPullPayment` + `pullPaymentWebhook` with their own shape.

## Code Standards

### Naming

- **Classes / Types**: PascalCase (`BTCPayClient`, `CreateInvoiceMiddlewareOptions`).
- **Functions / variables**: camelCase, descriptive verbs.
- **Constants / enums**: PascalCase enum names, SCREAMING_SNAKE_CASE values for cross-process strings (`InvoiceStatus.NEW = 'New'` matches BTCPay's casing).
- **Files**: camelCase for plain modules; PascalCase for class files (`BTCPayClient.ts`); test files mirror source with `.test.ts`.

### Common patterns

#### Higher-Order Middleware Factory

```ts
export const createInvoice = (
  options: CreateInvoiceMiddlewareOptions
): ExpressMiddleware => getCreateInvoiceMiddleware().create(options);
```

The factory caches a singleton `CreateInvoiceMiddleware` per process. Tests can call `resetCreateInvoiceMiddleware()` to discard it between cases.

**Location**: `src/middlewares/createInvoice.ts`

#### Singleton Configuration

`BTCPayConfiguration` reads env vars on first construction; `configure()` merges, `reset()` re-reads env. Mandatory keys (`baseURL`, `apiKey`, `storeId`) are validated lazily on `getConfig()`.

**Location**: `src/config/BTCPayConfig.ts`

#### Guard Clauses

Validate inputs at entry; return early before main logic.

```ts
if (!options.mapRequest) {
  throw new BTCPayValidationError('createInvoice: mapRequest function is required');
}
```

#### Error Hierarchy

```ts
BTCPayError
├── BTCPayApiError              // 4xx / 5xx from BTCPay (statusCode set)
├── BTCPayConfigError           // missing/invalid config
├── BTCPayValidationError       // bad caller input
├── BTCPayNetworkError          // axios network failure
└── BTCPayWebhookSignatureError // HMAC mismatch (statusCode 401)
```

#### Path Aliases

Configured in `tsconfig.json`:

```json
"paths": {
  "@/*": ["./*"],
  "@/types": ["./types"],
  "@/config": ["./config"],
  "@/client": ["./client"],
  "@/middlewares": ["./middlewares"],
  "@/utils": ["./utils"],
  "@/constants": ["./constants"]
}
```

Compiled output is rewritten by `tsc-alias` (run by `pnpm build`).

## Build & Development

```bash
pnpm run build         # tsc + tsc-alias
pnpm run build:watch
pnpm run type-check
pnpm test
pnpm test:watch
pnpm test:coverage
pnpm run lint
pnpm run lint:fix
pnpm run format
```

## Testing

- **Framework**: Jest with `ts-jest`.
- **Pattern**: Unit tests in `tests/unit/` mirror `src/` structure.
- **Coverage target**: ≥80% statements/lines (current ~95%).
- **Singleton cleanup**: call `BTCPayConfiguration.reset()` and the appropriate `resetXMiddleware()` in `afterEach` / `beforeEach`.
- **Axios mocking**: `jest.mock('axios')` then capture `mockedAxios.create` to return a stub with `post`, `get`, and `interceptors.response.use`.

## Webhook contract

BTCPay sends webhook events configured via the BTCPay UI. The HTTP request body is JSON, but to verify the signature it must be received raw:

```ts
app.post(
  '/webhooks/btcpay',
  express.raw({ type: 'application/json' }),
  BTCPayMiddleware.invoiceWebhook({ onSettled, onExpired })
);
```

The signature header is `BTCPay-Sig: sha256=<hex>`. We compute HMAC-SHA256 of the raw body using `webhookSecret` and compare in constant time. Subset of dispatched events: `InvoiceCreated`, `InvoiceReceivedPayment`, `InvoiceProcessing`, `InvoiceSettled`, `InvoicePaymentSettled`, `InvoiceExpired`, `InvoiceInvalid`.

## Cross-references

- **[docs/btcpay-server-swagger.json](docs/btcpay-server-swagger.json)** — local copy of the BTCPay Greenfield API OpenAPI spec; use it as the authoritative reference for endpoint paths, request/response schemas, and enum values when adding or auditing types.
- [BTCPay Greenfield API](https://docs.btcpayserver.org/API/Greenfield/v1/)
- [BTCPay Webhooks](https://docs.btcpayserver.org/API/Greenfield/v1/#tag/Webhooks)
- [Express.js docs](https://expressjs.com/)
- Sibling package: `@taloon/nowpayments-middleware`

## Workflow

### Adding a new middleware

1. Create class extending `BaseMiddleware` in `src/middlewares/`.
2. Define request/response types in `src/types/api.types.ts`.
3. Add corresponding method in `src/client/BTCPayClient.ts` if a new HTTP call is needed.
4. Create the factory + module-level cache + a `resetXMiddleware()` test helper.
5. Export from `src/index.ts` and re-add to the `BTCPayMiddleware` namespace.
6. Add tests under `tests/unit/middlewares/`.
7. Document in `docs/api-reference.mdx` with examples.

### Adding a new error type

1. Extend `BTCPayError` in `src/utils/errors.ts` with the right `code` and `statusCode`.
2. Export from `src/index.ts`.
3. Add coverage in `tests/unit/utils/errors.test.ts`.
4. Document in `docs/error-handling.mdx`.
