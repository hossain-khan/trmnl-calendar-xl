# Calendar XL 📅

Same old calendar, but XL. **NOW** front and center, **NEXT** at a glance, **LATER** in the wings — readable from across the room. No squinting required.

Built for TRMNL e-ink displays: big type, strong hierarchy, zero clutter. You know what's happening *right now*, what's up *next*, and what's coming *later* — all at a glance from your desk, shelf, or wall.

> 🔌 Requires a native **Google Calendar** plugin connected via Plugin Merge.

## 🚀 Getting Started

See [GETTING_STARTED.md](GETTING_STARTED.md) for setup instructions.

## 🖥️ Layouts

| Layout | Description |
|---|---|
| **Full** | NOW hero dominates the top, NEXT and LATER panels below |
| **Half Horizontal** | NOW/NEXT hero on the left, NEXT panel on the right |
| **Half Vertical** | NOW/NEXT hero on top, NEXT panel below |
| **Quadrant** | Single full-height NOW or NEXT hero — most compact |

## 🎛️ Plugin Settings

| Field | Description |
|---|---|
| **Calendar Source** | Pick your Google Calendar plugin instance from the dropdown |
| **Capitalize Event Text** | Show event names in ALL CAPS (on by default) |
| **Demo Mode** | Shows sample events to protect your data in previews (turn off once connected) |

## ⚠️ Known Constraints

- Only **Google Calendar** is supported via `plugin_instance_select`. Other calendar providers (Apple, Outlook, ICS) would need their own field.
- The quadrant layout shows only the NOW/NEXT hero — no LATER list.

## 📚 Resources

- [TRMNL Framework](https://trmnl.com/framework)
- [Plugin Guides](https://help.trmnl.com/en/collections/7820559-plugin-guides)
- [Device Models](https://trmnl.com/api/models)

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the repo-specific workflow.
For technical implementation details, see [docs/TECHNICAL_SKETCH.md](docs/TECHNICAL_SKETCH.md).
