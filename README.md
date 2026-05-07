# @taloon/btcpay-middleware

Express middleware for [BTCPay Server](https://btcpayserver.org/) integration with dependency injection.

This is a sibling library to `@taloon/nowpayments-middleware`, modeled to BTCPay's invoice-centric domain (not the deposit-address model used by NowPayments). Install whichever fits your gateway, or install both and compose them in your routes.

## Installation

```bash
pnpm add @taloon/btcpay-middleware
# peer dependency
pnpm add express
```

Requires Node.js >= 18.18.0.

## Configuration

```ts
import { BTCPayMiddleware } from '@taloon/btcpay-middleware';

BTCPayMiddleware.configure({
  baseURL: process.env.BTCPAY_BASE_URL!,        // e.g. https://btcpay.example.com
  apiKey: process.env.BTCPAY_API_KEY!,          // BTCPay API key (Greenfield)
  storeId: process.env.BTCPAY_STORE_ID!,
  webhookSecret: process.env.BTCPAY_WEBHOOK_SECRET, // optional but recommended
  errorHandling: 'next',                         // 'next' | 'direct'
});
```

Environment variables (read on first use, overridable via `configure()`):

| Variable                   | Required | Description                                      |
| -------------------------- | -------- | ------------------------------------------------ |
| `BTCPAY_BASE_URL`          | yes      | URL of your BTCPay Server instance               |
| `BTCPAY_API_KEY`           | yes      | API key with `btcpay.store.canmodifystoresettings` and `btcpay.store.cancreateinvoice` permissions |
| `BTCPAY_STORE_ID`          | yes      | Store ID                                         |
| `BTCPAY_WEBHOOK_SECRET`    | no       | HMAC secret configured on the BTCPay webhook UI  |

## Quick start

```ts
import express from 'express';
import { BTCPayMiddleware } from '@taloon/btcpay-middleware';

const app = express();
app.use(express.json());

app.post(
  '/checkout',
  BTCPayMiddleware.createInvoice({
    mapRequest: req => ({
      amount: req.body.total,
      currency: 'USD',
      orderId: req.body.orderId,
      buyerEmail: req.body.email,
    }),
    transformResponse: invoice => ({
      checkoutUrl: invoice.checkoutLink,
      invoiceId: invoice.id,
      status: invoice.status,
    }),
  }),
  (_req, res) => res.json(res.locals.btcpayResponse)
);

// HMAC-validated webhook — note the raw body parser
app.post(
  '/webhooks/btcpay',
  express.raw({ type: 'application/json' }),
  BTCPayMiddleware.invoiceWebhook({
    onSettled: payload => console.log('paid', payload.invoiceId),
    onExpired: payload => console.log('expired', payload.invoiceId),
  })
);

app.listen(3000);
```

## Available middlewares

| Middleware       | What it does                                                           |
| ---------------- | ---------------------------------------------------------------------- |
| `createInvoice`  | `POST /api/v1/stores/{storeId}/invoices` — returns `BTCPayInvoice`     |
| `getInvoice`     | `GET /api/v1/stores/{storeId}/invoices/{invoiceId}` — for reconciliation |
| `invoiceWebhook` | Verifies the `BTCPay-Sig` HMAC and dispatches by event type            |

The result of every middleware is stored on `res.locals.btcpayResponse` (namespaced so it won't collide with `res.locals.nowPaymentsResponse` if you use both libraries together).

## Webhook signature

If `webhookSecret` is configured, `invoiceWebhook` verifies the `BTCPay-Sig` header (`sha256=<hex>`) against the raw request body using HMAC-SHA256. Mount `express.raw({ type: 'application/json' })` before the middleware so the body remains a `Buffer`. Invalid signatures throw `BTCPayWebhookSignatureError` with `statusCode: 401`.

If `webhookSecret` is omitted, the signature step is skipped — useful for local development but not recommended for production.

## Documentation

- [Quick start](docs/quick-start.mdx)
- [API reference](docs/api-reference.mdx)
- [Configuration examples](docs/configuration-examples.mdx)
- [Invoice examples](docs/invoice-examples.mdx)
- [Webhook examples](docs/webhook-examples.mdx)
- [Error handling](docs/error-handling.mdx)

## License

MIT
