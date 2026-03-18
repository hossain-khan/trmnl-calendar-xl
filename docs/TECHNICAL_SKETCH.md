# Technical Sketch

This document describes the current implementation in this repository.

## Architecture

Calendar XL is Merge-only — there is no backend, API adapter, or pre-derivation step.

- A native TRMNL **Google Calendar** plugin provides the source data.
- Calendar XL receives that data through **TRMNL Plugin Merge** via the `calendar_source` custom field (`plugin_instance_select`, `plugin_keyname: google_calendar`).
- The user selects their Google Calendar instance from the plugin settings dropdown — no hardcoded merge namespace in the templates.
- The Liquid templates derive NOW, NEXT, and LATER directly from the merged `events` array.

The shared setup lives in [templates/shared.liquid](../templates/shared.liquid) and is included by all layout files:

- [templates/full.liquid](../templates/full.liquid)
- [templates/half_horizontal.liquid](../templates/half_horizontal.liquid)
- [templates/half_vertical.liquid](../templates/half_vertical.liquid)
- [templates/quadrant.liquid](../templates/quadrant.liquid)

## Merge Data Shape

TRMNL Plugin Merge exposes native plugin data under a namespaced root shaped like `plugin_keyname_plugin_setting_id`.

Use [assets/demo/trmnl-plugin-merge-snapshot.json](../assets/demo/trmnl-plugin-merge-snapshot.json) as the reference payload. It shows the shape the layouts are written against:

```json
{
  "google_calendar_123456": {
    "events": [
      {
        "summary": "Deep Work",
        "date_time": "2026-03-17T14:00:00-04:00",
        "all_day": false,
        "start_full": "2026-03-17T14:00:00-04:00",
        "end_full": "2026-03-17T16:00:00-04:00",
        "start": "2:00 PM",
        "end": "4:00 PM"
      }
    ],
    "time_format": "am/pm",
    "date_format": "%a, %b %-d",
    "today_in_tz": "2026-03-17T00:00:00-04:00",
    "event_layout": "schedule"
  }
}
```

## Fields Used By The Templates

From the merged calendar node:

- `events`
- `events[].summary`
- `events[].date_time`
- `events[].all_day`
- `events[].start_full`
- `events[].end_full`
- `events[].start`
- `events[].end`
- `today_in_tz`
- `date_format`
- `time_format`
- `event_layout`

From plugin custom fields:

- `calendar_source` — resolves to the merged calendar node
- `capitalize_text` — optional boolean; ALL CAPS event names (default on)
- `demo_mode` — optional boolean; synthetic sample events for previews (default on)

## Derivation Logic

Each layout follows the same flow via `shared.liquid`:

1. Read `calendar.events` from the merged namespace.
2. Compute `now_ts` from the current render time.
3. Walk the event list once to select `current_event` (active) and `next_event` (upcoming).
4. Render LATER by walking future events and skipping the already-selected `next_event`.
5. Derive date and time labels from `today_in_tz` and `time_format`.

## Event Selection Rules

- `current_event` — first non-all-day event where `start_full <= now < end_full`.
- `next_event` — first non-all-day event where `start_full > now`.
- LATER — future events after now, excluding `next_event`.
- All-day events are excluded from NOW and NEXT; they may appear in LATER.
- When no current event exists, `next_event` is promoted into the hero (NOW slot shows FREE).

## Smart Time Labels

Time display adapts based on whether the event is today or a future day:

- **Same day** → time range: `12:00 PM – 1:00 PM`
- **Different day, timed** → date + start time: `MAR 19 AT 12:00 PM`
- **Different day, all-day** → date only: `MAR 20`

These are computed in `shared.liquid` as `primary_event_time_label` and `next_event_time_label`.

## Layout Notes

### Full

- NOW panel uses the strongest inverted treatment (top 60% of height).
- NEXT and LATER share the bottom row as a 2-column grid.
- `later_limit` adapts by device size and orientation (2–4 items).

### Half Horizontal

- Hero (NOW or NEXT) occupies the left two-thirds (`col--span-2` of a 3-column grid).
- NEXT panel is on the right third.

### Half Vertical

- Hero (NOW or NEXT) occupies the top two-thirds (`h--[67cqh]`).
- NEXT panel fills the remaining space below.

### Quadrant

- Single full-height hero shows NOW or NEXT — whichever is most immediately relevant.
- No LATER or context block is shown.

## Known Constraints

- The merge namespace is resolved automatically from `calendar_source`; no per-file update is needed when the calendar instance changes.
- The `later_limit` is derived dynamically in `shared.liquid` based on `device_size` and `is_portrait`.
- The quadrant layout shows only the primary hero — no LATER or context block.
- `current_time_label` is derived from the device render time; `current_date_label` comes from the merged `today_in_tz`.
- Only Google Calendar is supported via `plugin_keyname: google_calendar`.

## Reference Payloads

- [assets/demo/trmnl-plugin-merge-snapshot.json](../assets/demo/trmnl-plugin-merge-snapshot.json) — namespaced merge payload for layout testing
- [assets/demo/trmnl-plugin-data-calendar.json](../assets/demo/trmnl-plugin-data-calendar.json) — raw native calendar payload without the merge wrapper

## Testing Guidance

- Use the namespaced snapshot when testing layout rendering in the TRMNL Markup Editor.
- Test both active-event and free-time scenarios.
- Verify all-day events do not appear as NOW or NEXT.
- Check long summaries clamp cleanly in each layout size.
- Test portrait and landscape orientations on lg devices.
