# Payment Webhook Security References

## Stripe

Official sources:

- https://docs.stripe.com/webhooks/signature
- https://docs.stripe.com/webhooks

Implementation requirements verified on 2026-08-08:

- Signature verification must use the unmodified UTF-8 raw request body, the `Stripe-Signature` header and the endpoint signing secret.
- In Express, the webhook route/raw body parser must be registered before the global `express.json()` middleware.
- The signature header uses the `t=<timestamp>,v1=<signature>` structure. Verification must enforce a timestamp tolerance to reduce replay exposure.
- Stripe can retry deliveries; processing must be idempotent by event ID.
- Production webhook endpoints must use HTTPS and should return a `2xx` response quickly after safe receipt/claiming.

## iyzico

Official source:

- https://docs.iyzico.com/en/advanced/webhook

Implementation requirements verified on 2026-08-08:

- Legacy `X-Iyz-Signature` and `X-Iyz-Signature-V2` are deprecated; current verification uses `X-IYZ-SIGNATURE-V3`.
- Signature V3 is HMAC-SHA256 encoded as lowercase hexadecimal and is derived from provider-defined ordered fields, not from an HMAC-SHA1 of the raw body.
- Direct-format source is `secretKey + iyziEventType + paymentId + paymentConversationId + status`; the HMAC key is also `secretKey` (`createHmac("sha256", secretKey).update(source).digest("hex")`).
- `iyziReferenceCode` is the unique delivery reference suitable for durable idempotency.
- iyzico sends the first notification roughly 10–15 seconds after the attempt and retries every 15 minutes until `2xx`, up to three deliveries; processing must therefore be idempotent and persist delivery state.
- Webhook signature delivery must be enabled for the merchant account, and production registration requires HTTPS.

## Project Decisions

- Payment webhook deliveries are claimed in `payment_webhook_events` with a database-level unique key on `(provider, eventId)`.
- The payload SHA-256 hash is stored and compared on duplicate event IDs to detect payload substitution.
- Failed processing may be retried atomically; processed or in-flight deliveries are not executed twice.
- Real payment completion remains blocked until actual gateway credentials, webhook secrets and a production HTTPS domain are supplied.

## Gateway Session Initialization

Official sources verified on 2026-08-08:

- https://docs.stripe.com/api/payment_intents/create
- https://docs.stripe.com/payments/payment-intents
- https://docs.iyzico.com/en/payment-methods/checkoutform/cf-implementation/cf-initialize
- https://github.com/iyzico/iyzipay-node

Implementation requirements:

- Stripe requires one server-created PaymentIntent per internal payment, amount in the smallest currency unit, and provider-level idempotency. The PaymentIntent ID must be stored and reused; only its `client_secret` is returned to the authenticated customer and must never be logged or placed in URLs.
- Stripe payment completion/failure is authoritative only after a verified webhook; a client callback cannot move escrow into `held`.
- iyzico uses hosted Checkout Form initialization for this project to avoid handling raw card data. Initialization requires verified buyer, billing address, basket item, callback URL and HTTPS in production.
- iyzico returns `token` and `paymentPageUrl`; the internal payment ID is used as `conversationId` and the resulting provider payment identifier must be persisted before accepting webhook state changes.
- Both providers fail closed on missing credentials, request timeout, malformed responses or mismatched amount/currency. No production service path can synthesize a successful payment.

## Mobile Checkout Presentation

Official sources verified on 2026-08-08:

- https://docs.expo.dev/versions/latest/sdk/stripe/
- https://docs.stripe.com/payments/accept-a-payment?payment-ui=mobile&platform=react-native
- https://docs.iyzico.com/en/payment-methods/checkoutform

Implementation requirements:

- Stripe card collection uses the official `@stripe/stripe-react-native` PaymentSheet on Android/iOS. The mobile client receives only the publishable key and PaymentIntent client secret; the secret API key never enters the app bundle.
- Stripe 3D Secure and redirect-based methods require the Expo-compatible URL scheme. Apple Pay and Google Pay require a development/production build and are not treated as verified in Expo Go.
- The internal payment remains `pending` after client presentation. Only a verified, idempotently processed gateway webhook may move escrow to `held` or `refunded`.
- iyzico uses the hosted Checkout Form URL in the system browser/in-app browser flow; raw card fields are never rendered or stored by Move&Fix.
- Missing publishable key, missing gateway credentials, browser cancellation, SDK failure and timeout are user-visible blockers/errors, never success states.
