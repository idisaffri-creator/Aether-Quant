# Discord Webhook Setup

Aether Energy can push notifications to Discord via webhook.

## 1. Create a Discord webhook

1. In your Discord server, go to **Server Settings → Integrations → Webhooks**
2. Click **New Webhook**
3. Name it "Aether Energy" and pick a channel
4. Copy the webhook URL (looks like `https://discord.com/api/webhooks/123456789/abcdef...`)

## 2. Configure the env var

Add to `/root/aether-energy/.env` on the VPS:
```
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/123456789/abcdef...
```

Then restart PM2:
```bash
pm2 delete aether
pm2 start ecosystem.config.cjs
```

## 3. Test the webhook

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"title":"Test","description":"Discord webhook works!","color":65280}' \
  https://aether-energy.ai/api/alerts/discord
```

## 4. What gets sent

The `notify()` service (`server/services/notify.ts`) sends Discord embeds for:

| Event | Color | Description |
|---|---|---|
| `trade_fill` | Green (0x10b981) | "BUY 1 WTI @ $75.50" with symbol + price |
| `kyc_status` | Blue (0x3b82f6) | "KYC approved ✓" or "KYC needs attention" |
| `security_alert` | Amber (0xf59e0b) | "New login from IP..." |

## 5. Configure which events notify you

Users control this via `preferences.notifications` in the user object:
```json
{
  "notifications": {
    "tradeFills": true,
    "kycUpdates": true,
    "securityAlerts": true
  }
}
```

## 6. Troubleshooting

- Not receiving? Check `/api/alerts/config`:
  ```bash
  curl https://aether-energy.ai/api/alerts/config
  # { "alertWebhook": true, "discordWebhook": true, "sentryToken": false }
  ```
- If `discordWebhook: false`, the env var isn't set. Restart PM2 after adding it.
- Check PM2 logs: `pm2 logs aether | grep discord`

## 7. Slack (bonus)

The same `ALERT_WEBHOOK_URL` can be a Slack incoming webhook URL — it uses the same `text` + `attachments` format that Slack expects.
