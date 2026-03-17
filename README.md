# Calendar XL

Calendar XL is a TRMNL agenda plugin built around a single idea: show the current event, the next event, and a small amount of later context with enough hierarchy to read from across the room.

## Current Architecture

This repository is Merge-only.

- A native TRMNL calendar plugin provides the source data.
- Calendar XL receives that data through TRMNL Plugin Merge via the `calendar_source` custom field (`plugin_instance_select`, `plugin_keyname: google_calendar`).
- The user selects their Google Calendar instance from the plugin settings dropdown — no hardcoded merge namespace in the templates.
- The Liquid templates derive NOW, NEXT, and LATER directly from the merged `events` array.
- There is no backend data transformer or custom JSON contract in this repository.

## Layout Model

### Full

- NOW takes the top half of the screen with inverted treatment and the largest type.
- NEXT gets a dedicated secondary panel.
- LATER shows a short supporting list.

### Half Horizontal

- NOW/NEXT hero occupies the left two-thirds.
- NEXT (or secondary next) panel is on the right third.

### Half Vertical

- NOW/NEXT hero occupies the top two-thirds.
- NEXT (or secondary next) panel fills the remaining space below.

### Quadrant

- A single full-height hero shows NOW or NEXT — whichever is most immediately relevant.

## Merge Data Shape

TRMNL Plugin Merge exposes native plugin data under a namespaced root shaped like `plugin_keyname_plugin_setting_id`.

Use [assets/demo/trmnl-plugin-merge-snapshot.json](assets/demo/trmnl-plugin-merge-snapshot.json) as the reference payload for this project. It shows the shape the layouts are written against:

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

The templates currently rely on these fields from the merged node:

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

## Liquid Derivation Rules

Each layout computes the same agenda state in Liquid:

- `current_event`: first timed event where `start_full <= now < end_full`
- `next_event`: first timed event where `start_full > now`
- `later`: later future events excluding the selected `next_event`

All-day events are skipped for NOW and NEXT. They can still appear in LATER when they fall after the current time.

## Custom Fields In Use

The current templates use these fields from [custom-fields.yml](custom-fields.yml):

- `calendar_source` — `plugin_instance_select` field; user picks their Google Calendar plugin instance; resolves to the merged data node in templates
- `custom_title`

Everything else about event formatting comes from the merged native calendar payload, not from a separate backend contract.

## Testing

Use the saved Merge payloads in [assets/demo](assets/demo) when testing in the TRMNL Markup Editor.

- [assets/demo/trmnl-plugin-merge-snapshot.json](assets/demo/trmnl-plugin-merge-snapshot.json) is the best fixture for layout testing because it includes the namespaced merge root.
- [assets/demo/trmnl-plugin-data-calendar.json](assets/demo/trmnl-plugin-data-calendar.json) is useful when you want to inspect the raw native calendar payload without the merge namespace wrapper.

Validate these cases:

- Active current event
- No current event, NOW shows `FREE`
- No next timed event, NEXT shows its fallback state
- Long titles clamp cleanly
- 2, 3, and 4 LATER items
- All-day items are deprioritized out of NOW and NEXT

## Files

- [templates/shared.liquid](templates/shared.liquid) contains the reusable agenda components and merge note.
- [templates/full.liquid](templates/full.liquid) implements the strongest Now/Next/Later hierarchy.
- [templates/half_horizontal.liquid](templates/half_horizontal.liquid) uses a left/right split: hero on the left, NEXT on the right.
- [templates/half_vertical.liquid](templates/half_vertical.liquid) uses a top/bottom split: hero on top, NEXT below.
- [templates/quadrant.liquid](templates/quadrant.liquid) shows a single full-height hero for the most compact dashboards.
- [docs/PRD.md](docs/PRD.md) captures the product intent.
- [docs/TECHNICAL_SKETCH.md](docs/TECHNICAL_SKETCH.md) captures the current Merge-based implementation.

## Known Constraints

- The `calendar_source` field only surfaces Google Calendar instances. Users with Apple Calendar, Outlook, or ICS-based calendars would need a separate `plugin_instance_select` field targeting the appropriate `plugin_keyname`.
- The LATER section is hardcoded to a maximum of 3 items in all layouts that show it.
- The quadrant layout shows only the primary hero (NOW or NEXT) without LATER or a context block.
- `current_time_label` is derived from the device render time, while `current_date_label` comes from the merged calendar payload.

## Resources

- [TRMNL Framework](https://trmnl.com/framework)
- [Device Models API](https://trmnl.com/api/models)
- [Plugin Guides](https://help.trmnl.com/en/collections/7820559-plugin-guides)
- [Liquid 101](https://help.trmnl.com/en/articles/10671186-liquid-101)
- [Advanced Liquid](https://help.trmnl.com/en/articles/10693981-advanced-liquid)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repo-specific workflow.
