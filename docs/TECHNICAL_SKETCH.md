# Technical Sketch

This document describes the current implementation in this repository.

## Current Data Source

Calendar XL renders from TRMNL Plugin Merge data produced by a native calendar plugin. The merged payload is exposed under a namespaced root such as `google_calendar_29713`.

The layouts currently hard-code that namespace at the top of each file:

- [templates/full.liquid](../templates/full.liquid)
- [templates/half_horizontal.liquid](../templates/half_horizontal.liquid)
- [templates/half_vertical.liquid](../templates/half_vertical.liquid)
- [templates/quadrant.liquid](../templates/quadrant.liquid)

## Reference Payloads

- [assets/demo/trmnl-plugin-merge-snapshot.json](../assets/demo/trmnl-plugin-merge-snapshot.json): namespaced merge payload used for layout testing
- [assets/demo/trmnl-plugin-data-calendar.json](../assets/demo/trmnl-plugin-data-calendar.json): raw native calendar payload without the merge namespace

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

- `max_later_items`
- `show_icons`
- `custom_title`

## Derivation Logic

Each layout follows the same broad flow:

1. Read `calendar.events` from the merged namespace.
2. Compute `now_ts` from the current render time.
3. Walk the event list once to select the active timed event and the next timed event.
4. Render later items by walking future events again and skipping the selected next event.
5. Derive date and time labels from `today_in_tz`, `date_format`, and `time_format`.

The shared rendering primitives live in [templates/shared.liquid](../templates/shared.liquid).

## Event Selection Rules

- `current_event` is the first non-all-day event where `start_full <= now < end_full`.
- `next_event` is the first non-all-day event where `start_full > now`.
- LATER shows future events after now, excluding the chosen `next_event`.
- All-day events are excluded from NOW and NEXT.

## Layout Notes

### Full

- NOW panel uses the strongest inverted treatment.
- NEXT and LATER share the bottom row.
- The title bar instance label comes from `calendar.event_layout`.

### Half Horizontal

- NOW occupies the top half.
- NEXT and LATER share the lower grid.

### Half Vertical

- NOW occupies the left column.
- NEXT and LATER stack on the right.

### Quadrant

- LATER is fixed to 2 items.
- CONTEXT shows current time and current date.

## Known Constraints

- The merge namespace is duplicated across all four layout files.
- `max_later_items` does not affect the quadrant layout.
- `show_icons` is optional presentation only.
- The repo does not contain a backend, API adapter, or pre-derivation step.

## Testing Guidance

- Use the namespaced snapshot when testing layout rendering.
- Test both active-event and free-time scenarios.
- Verify all-day events do not appear as NOW or NEXT.
- Check long summaries in each layout size.
