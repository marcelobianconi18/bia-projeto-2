# Meta Ads (Facebook) setup

To enable Meta (formerly Facebook) Ads connectors used by BIA, set the following environment variables in `server/.env` (or your deployment secrets). Do NOT commit secrets to the repository.

- `META_TOKEN` (preferred): your long-lived access token that can be used to call the Meta Marketing API.
- `META_ACCESS_TOKEN`: alternative name accepted by the server.
- `META_ADS_ACCOUNT_ID`: your ad account id (numeric or `act_` prefixed).
- Optional helper IDs: `META_BUSINESS_ID`, `META_PIXEL_ID`, `META_DATASET_ID`.

Quick local test (server running on default host/port):

```bash
# make the script executable once:
chmod +x ./scripts/verify-meta-token.sh
./scripts/verify-meta-token.sh localhost 3001
```

Notes:
- The server exposes a verify endpoint at `/api/connectors/meta-ads/verify`. Use `?probe=1&debug=1` to force an API call and get a debug response.
- If the response shows `status: REAL` and account data, your token and account id are valid and reachable.
- Keep tokens secret. Use your platform's secret manager (Heroku/Netlify/Vercel/Cloud Run) for deployments.
- To allow real Meta calls in local dev, set `VITE_REAL_ONLY=false` in `.env.local`.
- Ensure `META_HOTSPOTS_TEST` is unset or `0` to avoid test fixtures.

## Security

- Never commit `.env` files with real tokens. Add `.env` to `.gitignore` and rely on environment secrets in CI/CD.
- Rotate tokens periodically and grant the minimal scopes required (pages_show_list, ads_management, ads_read, business_management, pages_read_engagement, public_profile).
