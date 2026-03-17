# Getting Started

Calendar XL renders entirely from TRMNL Plugin Merge data supplied by a native calendar plugin.

## 1. Add a Native Calendar Plugin

Create or connect a native TRMNL calendar source such as Google Calendar. Confirm that it produces the fields shown in [assets/demo/trmnl-plugin-data-calendar.json](assets/demo/trmnl-plugin-data-calendar.json).

## 2. Merge That Plugin Into Calendar XL

In TRMNL, configure Calendar XL to receive the native calendar plugin through Plugin Merge. The merged payload will appear under a namespaced root such as `google_calendar_29713`.

The current layouts are written against a single merge namespace and do not auto-discover it.

## 3. Select the Calendar Source in Plugin Settings

Open the Calendar XL plugin settings and choose your Google Calendar instance from the **Calendar Source** dropdown. The merged payload is resolved automatically — no manual namespace update is required in the template files.

## 4. Configure the Optional UI Fields

The current implementation uses these plugin fields from [custom-fields.yml](custom-fields.yml):

- Custom title override

Time format and event formatting come from the merged calendar payload.

## 5. Load the Demo Merge Payload

Use [assets/demo/trmnl-plugin-merge-snapshot.json](assets/demo/trmnl-plugin-merge-snapshot.json) in the TRMNL Markup Editor when validating layout behavior.

If you want to inspect the raw calendar data without the merge wrapper, use [assets/demo/trmnl-plugin-data-calendar.json](assets/demo/trmnl-plugin-data-calendar.json).

## 6. Verify Each Layout

Test each template against the PRD:

- [templates/full.liquid](templates/full.liquid): NOW dominates, NEXT and LATER support.
- [templates/half_horizontal.liquid](templates/half_horizontal.liquid): hero on left, NEXT panel on right.
- [templates/half_vertical.liquid](templates/half_vertical.liquid): hero on top, NEXT panel below.
- [templates/quadrant.liquid](templates/quadrant.liquid): single full-height NOW/NEXT hero.

## 7. Check Edge Cases

Validate these cases before publishing:

- No current event shows `FREE`
- No next timed event shows a clear fallback
- Long titles clamp without breaking layout
- All-day events stay out of NOW and NEXT
- Back-to-back meetings switch NOW and NEXT cleanly at minute boundaries

## 8. Refresh Expectations

The plugin refreshes every minute. Calendar XL derives its state at render time from the merged event list, so NOW and NEXT transition based on the current device render time plus the merged event timestamps.

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
- Check for syntax errors such as unmatched tags or quotes.
- Verify the merge namespace in the template matches your actual merged payload.
- Test with [assets/demo/trmnl-plugin-merge-snapshot.json](assets/demo/trmnl-plugin-merge-snapshot.json) before debugging live data.

**Layout breaks on some devices?**
- Test on all device sizes in markup editor
- Use responsive classes: `sm:`, `md:`, `lg:`
- Avoid fixed widths - use `flex: 1` or percentages

**Data not displaying?**
- Confirm the merged node exists and contains an `events` array.
- Check that the layout files all point to the same plugin merge namespace.
- Verify your native calendar plugin exposes `start_full`, `end_full`, `start`, and `end`.

**Text overflowing?**
- Use `data-clamp="2"` to limit lines
- Set `max-width` on containers
- Use `truncate` filter for single lines

## Need Help?

- Check [TRMNL Framework Docs](https://trmnl.com/framework)
- Read [Plugin Guides](https://help.trmnl.com/en/collections/7820559-plugin-guides)
- Review [Liquid Documentation](https://shopify.github.io/liquid/)
- Check [.github/copilot-instructions.md](.github/copilot-instructions.md) for project-specific guidance
