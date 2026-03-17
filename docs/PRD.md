# 📄 Product Requirements Doc (PRD)

## Feature: “Now / Next / Later” Agenda Plugin (Large Text Mode)

---

## 1. 🎯 Objective

Design a **highly glanceable calendar view** optimized for distance reading on TRMNL devices by:

* Highlighting **current activity (NOW)** prominently
* Providing quick awareness of **upcoming (NEXT)** and **future (LATER)** events
* Using **large typography, minimal text, and strong hierarchy**

## 1.1 Implementation Status

The current repository implements this product direction using TRMNL Plugin Merge data from a native calendar plugin. NOW, NEXT, and LATER are derived in Liquid from merged calendar events rather than from a separate backend transformer.

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

### Input (from merged native calendar plugin)

```json
Event {
  summary: string
  start_full: ISO | YYYY-MM-DD
  end_full: ISO | YYYY-MM-DD
  start: string
  end: string
  date_time: ISO | YYYY-MM-DD
  all_day: boolean
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

# 📺 5.2 HALF HORIZONTAL (Left/Right Split)

## Layout Structure

```
[ NOW/NEXT (left ~67%) | NEXT (right ~33%) ]
```

---

## Rendering Rules

### Left (Hero)

Same as full screen NOW block — inverted, large text, time range.

---

### Right (NEXT)

```
NEXT
Bath
19:45 – 20:15
```

---

## Tradeoffs

* Keeps NOW dominant
* Compresses future info slightly

---

# 📱 5.3 HALF VERTICAL (Top/Bottom Split)

## Layout Structure

```
[ NOW/NEXT (top ~67%) ]
[ NEXT     (bottom ~33%) ]
```

---

## Rendering Rules

### Top (Hero)

* Very large text
* Minimal info
* Inverted (white on black)

---

### Bottom (NEXT)

```
NEXT
Bath
19:45 – 20:15
```

---

## Design Notes

* Align text left for readability
* Use divider between sections

---

# 🧩 5.4 QUADRANT (Single Hero)

## Layout Structure

```
[ NOW / NEXT — full height hero ]
```

---

## Rendering Rules

### Hero (full height)

* Shows NOW when an event is active, otherwise promotes NEXT
* Inverted treatment (white on black)
* Largest possible text via `data-value-fit`

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

Current implementation exposes these options in Calendar XL:

```json
{
  "laterLimit": 3,
  "customTitle": "Calendar XL"
}
```

`laterLimit` is hardcoded to 3 in `templates/shared.liquid` and is not user-configurable.

---

## 9. 🔄 Refresh Strategy

* Refresh every **1 minute**
* Recompute:

  * currentEvent
  * nextEvent
* Handle transitions smoothly

---

## 10. 🚀 MVP Scope

Implemented in this repository:

✅ Full Screen
✅ Half Horizontal
✅ Half Vertical
✅ Quadrant

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
