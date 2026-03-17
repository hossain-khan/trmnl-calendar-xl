# 📄 Product Requirements Doc (PRD)

## Feature: “Now / Next / Later” Agenda Plugin (Large Text Mode)

---

## 1. 🎯 Objective

Design a **highly glanceable calendar view** optimized for distance reading on TRMNL devices by:

* Highlighting **current activity (NOW)** prominently
* Providing quick awareness of **upcoming (NEXT)** and **future (LATER)** events
* Using **large typography, minimal text, and strong hierarchy**

---

## 2. 👤 User Problem

Traditional agenda views (like your screenshot) require:

* Reading multiple small items
* Scanning timestamps
* Cognitive effort to determine relevance

👉 This plugin should answer in **<2 seconds**:

* What am I doing now?
* What’s next?
* Anything important later?

---

## 3. 🧠 Core UX Principles

* **Hierarchy > completeness**
* **Max 3–5 items visible**
* **Large font always wins**
* **Time relevance > chronological list**
* **Descriptions are optional, titles are mandatory**

---

## 4. 📦 Data Model

### Input (from calendar API)

```json
Event {
  title: string
  startTime: ISO
  endTime: ISO
  isAllDay: boolean
}
```

---

### Derived State

```ts
now = current time

currentEvent = event where start <= now < end

nextEvent = first event where start > now

laterEvents = next 2–3 events after nextEvent
```

---

### Edge Cases

| Scenario            | Behavior                               |
| ------------------- | -------------------------------------- |
| No current event    | Show “FREE” or “NO EVENT”              |
| Overlapping events  | Pick earliest start or mark “MULTIPLE” |
| All-day event       | Show in LATER (low priority)           |
| Back-to-back events | NEXT becomes immediate                 |

---

## 5. 🧱 Layout System (TRMNL Modes)

---

# 🖥️ 5.1 FULL SCREEN (Best Experience)

## Layout Structure

```
[ NOW - 50% height ]
[ NEXT - 25% ]
[ LATER - 25% ]
```

---

## Rendering Rules

### NOW (Primary Focus)

* Font: **XL (largest possible)**
* Content:

  ```
  NOW
  DEEP WORK
  14:00 – 16:00
  ```
* If no event:

  ```
  NOW
  FREE
  ```

---

### NEXT

* Font: Large
* Show 1 event only

---

### LATER

* Max 2–3 items
* Compact format:

  ```
  • Party 17:00
  • Bath 19:45
  ```

---

## Visual Rules

* NOW block: inverted (white on black)
* Strong separators
* Generous padding

---

# 📺 5.2 HALF HORIZONTAL (Top/Bottom Split)

## Layout Structure

```
[ NOW (top 50%) ]
[ NEXT + LATER (bottom 50%) ]
```

---

## Rendering Rules

### Top (NOW)

Same as full screen

---

### Bottom

Split horizontally:

```
NEXT: Bath
19:45

• Party 17:00
• Tech Talk 11:30
```

---

## Tradeoffs

* Keeps NOW dominant
* Compresses future info slightly

---

# 📱 5.3 HALF VERTICAL (Left/Right Split)

## Layout Structure

```
[ NOW | NEXT + LATER ]
```

---

## Rendering Rules

### Left (NOW)

* Very large text
* Minimal info

---

### Right (Stacked)

```
NEXT
Bath
19:45

LATER
• Party 17:00
• Tech Talk
```

---

## Design Notes

* Align text left for readability
* Use divider line between sections

---

# 🧩 5.4 QUADRANT (4 Blocks)

## Layout Structure

```
[ NOW   | NEXT ]
[ LATER | CLOCK / DATE ]
```

---

## Rendering Rules

### Top Left: NOW

* Largest text in grid

### Top Right: NEXT

* Slightly smaller

### Bottom Left: LATER

* 2 items max

### Bottom Right: Context

* Date OR current time

```
MON, MAR 16
14:32
```

---

## Why this works

* Balanced information density
* Good for always-on display

---

## 6. 🎨 Typography Scale

| Element           | Size       |
| ----------------- | ---------- |
| NOW title         | 100% (max) |
| NEXT              | 70%        |
| LATER             | 40–50%     |
| Labels (NOW/NEXT) | Small caps |

---

## 7. 🎯 Content Rules (Important)

* Remove filler words:

  * ❌ “Lunch Break”
  * ✅ “LUNCH”

* Truncate titles:

  * Max 2 lines
  * Prefer uppercase

* Time format:

  * Always `HH:MM`
  * Avoid seconds

---

## 8. ⚙️ Configuration Options

Expose these in plugin:

```json
{
  "maxLaterItems": 3,
  "showAllDayEvents": false,
  "timeFormat": "24h",
  "showSeconds": false,
  "compactMode": false,
  "showIcons": true
}
```

---

## 9. 🔄 Refresh Strategy

* Refresh every **1 minute**
* Recompute:

  * currentEvent
  * nextEvent
* Handle transitions smoothly

---

## 10. 🚀 MVP Scope

Start with:

✅ Full Screen
✅ Half Horizontal

Then add:

⬜ Half Vertical
⬜ Quadrant

---

## 11. 🧪 Example Output (Full Screen)

```
NOW
DEEP WORK
14:00 – 16:00

NEXT
BATH
19:45 – 20:15

• PARTY 17:00
• TECH TALK 11:30
```

---

## 12. 💡 Future Enhancements

* Progress bar for NOW
* “Ends in X min”
* Color coding (if TRMNL supports)
* Smart grouping (work/personal)
* Focus mode toggle

---

## Final Thought

If you implement this well, it won’t feel like a calendar—it’ll feel like a **status display for your life**, which is exactly what TRMNL is best at.
