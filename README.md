# Calendar XL

Calendar XL is a TRMNL agenda plugin that turns a busy calendar into a large-text status display. It prioritizes three questions from the PRD: what is happening now, what is next, and what matters later.

## Purpose

The plugin is designed for glanceability at distance rather than completeness. Instead of rendering a dense agenda list, each layout gives the current event dominant space, keeps the next event obvious, and compresses later items into a short supporting list.

## Layout Model

### Full

- NOW takes the top half of the screen with inverted treatment and the largest type.
- NEXT gets a dedicated secondary panel.
- LATER shows up to 2 to 3 compact items.

### Half Horizontal

- NOW fills the top half.
- The bottom half splits into NEXT and LATER.

### Half Vertical

- NOW is isolated on the left.
- NEXT and LATER stack on the right for quick left-to-right scanning.

### Quadrant

- NOW, NEXT, LATER, and date/time each get one quadrant.

## Data Contract

The backend should send derived agenda state rather than raw calendar events so the templates can remain simple.

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

Recommended backend derivation:

```ts
currentEvent = first event where start <= now && now < end
nextEvent = first event where start > now
laterEvents = events after nextEvent, limited by maxLaterItems
```

## Configuration

The plugin exposes a small set of calendar-specific options in [custom-fields.yml](custom-fields.yml):

- `calendar_feed_url`
- `max_later_items`
- `show_all_day_events`
- `time_format`
- `compact_mode`
- `show_icons`
- `custom_title`

The default refresh rate in [settings.yml](settings.yml) is 1 minute to keep NOW and NEXT accurate during transitions.

## Development Notes

- Keep titles short and uppercase when possible.
- Prefer formatted `time_label` strings from the backend over doing time math in Liquid.
- Treat all-day events as lower priority and place them in LATER unless product requirements change.
- Always preserve a useful empty state. If there is no current event, NOW should read `FREE`.

## Testing

Use the sample payload in [assets/demo/sample-data.json](assets/demo/sample-data.json) with the TRMNL Markup Editor.

Validate these cases:

- Active current event
- No current event, NOW shows FREE
- No next event, NEXT shows clear fallback
- Long titles clamp cleanly
- 2, 3, and 4 LATER items
- All-day events on and off

## Files

- [templates/shared.liquid](templates/shared.liquid) contains the reusable agenda components.
- [templates/full.liquid](templates/full.liquid) implements the strongest Now/Next/Later hierarchy.
- [templates/half_horizontal.liquid](templates/half_horizontal.liquid) adapts the same hierarchy to stacked halves.
- [templates/half_vertical.liquid](templates/half_vertical.liquid) uses a left-right split with text aligned for fast scanning.
- [templates/quadrant.liquid](templates/quadrant.liquid) adds a date/time context panel for compact dashboards.
- [Framework Design Docs](https://trmnl.com/framework) - Complete design system reference
- [Device Models API](https://trmnl.com/api/models) - Device specifications
- [Plugin Guides](https://help.trmnl.com/en/collections/7820559-plugin-guides) - How-to guides
- [Liquid 101](https://help.trmnl.com/en/articles/10671186-liquid-101) - Liquid basics
- [Advanced Liquid](https://help.trmnl.com/en/articles/10693981-advanced-liquid) - Advanced techniques

### Responsive Breakpoints

| Device | Size | Width | Display | Breakpoint |
|--------|------|-------|---------|-----------|
| TRMNL X | Large | 1040px | 4-bit (16 shades) | lg: |
| TRMNL OG V2 | Medium | 800px | 2-bit (4 shades) | md: |
| TRMNL OG | Medium | 800px | 1-bit (2 shades) | md: |
| Kindle 2024 | Small | 800px | 8-bit (256 shades) | sm: |
| BYOD Devices | Various | 600-1200px | Various | sm:/md:/lg: |

### Framework Utilities Quick Reference

```liquid
<!-- Layout -->
<div class="flex flex--row flex--center-x gap--medium h--full">

<!-- Typography -->
<span class="value value--small md:value--large lg:value--xlarge">42</span>
<span class="title title--medium">Heading</span>
<span class="label">Label</span>
<span class="description">Description text</span>

<!-- Spacing -->
<div class="p--2 mb--small gap--medium">

<!-- Visual -->
<div class="bg--white rounded outline">
<img src="..." class="image image--contain image-dither">

<!-- Responsive -->
<div class="flex flex--col portrait:flex--row md:gap--large">
```

## 🐛 Common Issues & Solutions

### Layout Breaking on Different Devices
- Test all 4 device sizes in TRMNL Markup Editor
- Use responsive breakpoints consistently
- Avoid complex CSS - use framework utilities instead

### Text Overflow
- Use `data-clamp="2"` to limit lines
- Set `max-width` on text containers
- Test with long sample data

### Images Not Displaying
- Always use `object-fit: contain`
- Use `image--contain` class
- Ensure URLs are HTTPS
- Check actual display with `image-dither`

### Missing Error States
- Always check `if has_data` before rendering
- Provide helpful error messages
- Test unconfigured state

## 📝 Customization Checklist

When creating your plugin:

- [ ] Customize `.github/copilot-instructions.md` with your project details
- [ ] Update `settings.yml` with your endpoint and configuration
- [ ] Update `custom-fields.yml` with your form fields
- [ ] Edit all 5 template files (`full.liquid`, etc.)
- [ ] Create your asset files (icons, demo images)
- [ ] Update this `README.md` with project-specific info
- [ ] Test in TRMNL Markup Editor with sample data
- [ ] Deploy your backend API
- [ ] Test with real data before publishing

## 🚢 Deployment

### Publishing to TRMNL

1. Create a plugin recipe in [TRMNL Dashboard](https://app.trmnl.com)
2. Upload template files:
   - All 5 `.liquid` files
   - Icons and assets
3. Configure settings.yml and custom-fields.yml
4. Add description, screenshots, and documentation
5. Submit for review

### Backend Deployment

Deploy your API endpoint somewhere accessible:
- Cloudflare Workers
- Node.js server
- Python server
- Serverless (Lambda, Cloud Functions, etc.)

Ensure:
- ✅ HTTPS only
- ✅ Returns valid JSON
- ✅ Responds in <3 seconds
- ✅ Error handling included

## 📄 License

This template is provided under the MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Improvements and contributions welcome! If you:
- Find better patterns
- Improve documentation
- Fix bugs
- Add features

Please open an issue or pull request.

## 📞 Getting Help

- Check the [TRMNL Framework docs](https://trmnl.com/framework)
- Review the [copilot-instructions.md](.github/copilot-instructions.md)
- Check [TRMNL Help Center](https://help.trmnl.com)
- Open an issue in this repository

---

**Happy building! 🎉**

For questions about the template, see [TEMPLATE_USAGE.md](.github/TEMPLATE_USAGE.md).
