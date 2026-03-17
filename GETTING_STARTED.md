# Getting Started

This repository is no longer a generic template. It is scoped to the Calendar XL concept from the Now / Next / Later PRD.

## 1. Connect a Calendar Source

Set a real backend endpoint in [settings.yml](settings.yml):

```yaml
polling_url: "https://your-calendar-api.example.com/trmnl/agenda"
```

The backend is responsible for:

- Fetching raw calendar events
- Deriving `current_event`, `next_event`, and `later_events`
- Formatting user-facing time labels
- Respecting plugin settings such as `max_later_items` and `time_format`

## 2. Configure the Plugin Fields

The current fields in [custom-fields.yml](custom-fields.yml) are aligned with the PRD and cover the MVP configuration:

- Calendar feed URL
- Maximum number of LATER items
- Show all-day events
- 12h or 24h time formatting
- Compact mode
- Optional section icons
- Custom title override

## 3. Use the Sample Payload

Start with [assets/demo/sample-data.json](assets/demo/sample-data.json) in the TRMNL Markup Editor. It exercises all three agenda sections and the date/time context used by the quadrant layout.

## 4. Verify the Layouts

Test each template against the PRD:

- [templates/full.liquid](templates/full.liquid): NOW dominates, NEXT and LATER support.
- [templates/half_horizontal.liquid](templates/half_horizontal.liquid): NOW on top, supporting agenda below.
- [templates/half_vertical.liquid](templates/half_vertical.liquid): NOW left, future agenda right.
- [templates/quadrant.liquid](templates/quadrant.liquid): compact four-block dashboard.

## 5. Check Edge Cases

Before wiring this into a real calendar backend, verify:

- No current event shows `FREE`
- No next event shows a clear fallback
- Long titles clamp without breaking layout
- All-day events can be excluded or included in LATER
- Back-to-back meetings switch NOW and NEXT cleanly at minute boundaries

## 6. Backend Output Example

```json
{
  "has_data": true,
  "current_date_label": "MON, MAR 16",
  "current_time_label": "14:32",
  "context_label": "3 UPCOMING",
  "current_event": {
    "title": "DEEP WORK",
    "time_label": "14:00 - 16:00",
    "is_free": false
  },
  "next_event": {
    "title": "BATH",
    "time_label": "19:45 - 20:15"
  },
  "later_events": [
    { "title": "PARTY", "time_label": "17:00" },
    { "title": "TECH TALK", "time_label": "11:30" }
  ]
}
```

## 7. Refresh Expectations

The plugin is configured to refresh every minute. If your backend caches responses, keep the cache window below 60 seconds or NOW and NEXT will drift during event transitions.

## Framework Classes Reference

### Layout
```liquid
<!-- Flexbox -->
<div class="flex flex--row flex--center-x flex--center-y gap--medium h--full">

<!-- Grid -->
<div class="grid grid--cols-2 gap--small">

<!-- Spacing -->
<div class="p--2 mb--small">
```

### Typography
```liquid
<span class="value value--large md:value--xlarge">42</span>
<span class="title title--medium md:title--large">Heading</span>
<span class="label">Label</span>
<span class="description">Description text</span>
```

### Visual
```liquid
<div class="bg--white rounded outline text--center">
<img class="image image--contain image-dither">
```

### Responsive
```liquid
<!-- Size breakpoints -->
sm: (600px+)
md: (800px+)
lg: (1024px+)

<!-- Orientation -->
portrait:

<!-- Bit-depth -->
1bit: 2bit: 4bit: 8bit:
```

## Troubleshooting

**Templates not rendering?**
- Check for syntax errors (unmatched tags, quotes)
- Verify JSON data structure matches template variables
- Test in markup editor first before publishing

**Layout breaks on some devices?**
- Test on all device sizes in markup editor
- Use responsive classes: `sm:`, `md:`, `lg:`
- Avoid fixed widths - use `flex: 1` or percentages

**Data not displaying?**
- Verify backend API returns valid JSON
- Check custom field names match template variables
- Add error states to handle missing data

**Text overflowing?**
- Use `data-clamp="2"` to limit lines
- Set `max-width` on containers
- Use `truncate` filter for single lines

## Need Help?

- Check [TRMNL Framework Docs](https://trmnl.com/framework)
- Read [Plugin Guides](https://help.trmnl.com/en/collections/7820559-plugin-guides)
- Review [Liquid Documentation](https://shopify.github.io/liquid/)
- Check `.github/copilot-instructions.md` for project-specific guidance

---

**Good luck building your TRMNL plugin! 🎉**
