# Cornerstone Directory

Christian business directory, membership site, and digital marketplace.

## Required production settings

Railway must provide `DATABASE_URL` and `PORT`. Before deploying, also configure:

- `APP_URL`
- `SESSION_SECRET` (unique and at least 32 characters)
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_MARKETPLACE_WEBHOOK_SECRET`
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, and `R2_BUCKET_NAME`

Never commit real secret values to this repository.

## Administrator recovery

Administrator recovery is disabled unless `ADMIN_RECOVERY_TOKEN` is configured.
Temporarily set a strong recovery token, deploy, then open `/#/admin-recovery` and
set a new administrator password. Remove `ADMIN_RECOVERY_TOKEN` immediately after
recovery and restart the service.

## Local verification

Run `npm run check` followed by `npm run build` before deployment.
