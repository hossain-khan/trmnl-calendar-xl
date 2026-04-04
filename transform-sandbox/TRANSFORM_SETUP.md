# Using the Transform Sandbox to Fix Payload Size Error

## Problem

Calendar XL was receiving a 163 KB payload from the merged Google Calendar plugin, but TRMNL enforces a **100 KB limit** on plugin data.

```
[Calendar XL] Large payload received (163936 bytes), should be less than 100kb.
Solution: transform runtime
```

## Solution

TRMNL provides a built-in **Transform Sandbox** that runs JavaScript to filter/reduce the payload **before** it reaches your templates. This is the proper fix.

## How to Implement

### Step 1: Verify Plugin Settings (Done ✓)

Your `settings.yml` uses the **plugin_merge** strategy to receive calendar data from the merged Google Calendar plugin:

```yaml
strategy: "plugin_merge"
refresh_frequency: 1
```

⚠️ **Important**: `transform` is **NOT** a strategy. Transform is a post-processor that works WITH strategies like `plugin_merge`, `polling`, or `webhook`.

### Step 2: Add Transform Code to TRMNL Markup Editor

1. Go to **TRMNL Markup Editor**
2. Click the **Transform** tab (appears next to Markup tab when using any strategy)
3. Paste the entire JavaScript function from [transform.js](transform.js)
4. Click **Save**
5. **Force Refresh**: Go to plugin settings and click Force Refresh
6. Verify the error disappears in the TRMNL console

### Step 3: Verify It Works

After pasting the transform code and force refreshing:

1. Go back to the **Markup** tab
2. Check **Variables** section — you should see `google_calendar_*` with filtered events only
3. The error about large payload should disappear
4. Use the debug template to verify fields were removed correctly

## What the Transform Does

| Aspect | Before | After |
|--------|--------|-------|
| **Time Window** | All calendar events (months back/forward) | Next 30 days only |
| **Event Count** | All (~60+ events) | Top 30 events |
| **Fields** | Includes descriptions, attachments, attendees | Only essential fields (summary, times, status) |
| **Payload Size** | ~164 KB ❌ | ~40-60 KB ✓ |

## Technical Details

- **Runtime**: Node.js v22 (isolated-vm sandbox)
- **Timeout**: 1 second max execution
- **Access to form fields**: Use `input.trmnl.plugin_settings.custom_fields_values.fieldname`
- **No external network**: No internet calls allowed in the sandbox

## Troubleshooting

### The transform hasn't applied yet

- Force refresh from your device or plugin settings
- Check that you pasted the entire `transform()` function into the Transform tab
- Ensure no syntax errors in the JavaScript

### Events are missing from your calendar

- The filter limits to **next 30 days** — past events won't show
- The filter limits to **30 events** — if you have many events, earliest ones may be cut
- Adjust the date range in the transform code if needed

### Need to debug

1. Copy your real calendar payload from TRMNL Variables
2. Test the JavaScript locally before pasting into TRMNL
3. Check browser console logs while the plugin renders

## When You're Ready to Deploy

Once you've tested the transform in TRMNL Markup Editor:

1. The transform is **ready for production** — no deployment needed
2. The sandboxed JavaScript runs on TRMNL's infrastructure
3. Your templates in each layout file work unchanged
4. Refresh frequency remains **1 minute**

## Reference

- [TRMNL Transform Sandbox Documentation](https://help.trmnl.com/en/articles/12996946-parsing-plugins-with-the-sandbox-runtime)
- [TRMNL Liquid 101](https://help.trmnl.com/en/articles/10671186-liquid-101)
- [Debugging Private Plugins](https://help.trmnl.com/en/articles/11586187-debugging-private-plugins)
