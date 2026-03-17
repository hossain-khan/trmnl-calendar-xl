# 🧠 How TRMNL Plugin System Actually Works

From their SDK + BYOS repo:

* UI is rendered as **HTML → image (headless Chrome)** ([GitHub][1])
* Templates use **Liquid (Shopify-style templating)** ([GitHub][1])
* You inject **JSON data → Liquid → HTML → screen image** ([GitHub][1])

👉 So your job:

1. Prepare data (`now`, `next`, `later`) - this will come from https://docs.trmnl.com/go/private-api/plugin-data
2. Render with Liquid templates
3. Use TRMNL CSS framework (`plugins.css`)

---

# 📦 Expected Data Contract (IMPORTANT)

Your `PrepareData.ts` (or backend) should output:

This format will be different - load format from https://docs.trmnl.com/go/private-api/plugin-data

```json
{
  "now": {
    "title": "Deep Work",
    "start": "14:00",
    "end": "16:00"
  },
  "next": {
    "title": "Bath",
    "start": "19:45",
    "end": "20:15"
  },
  "later": [
    { "title": "Party", "start": "17:00" },
    { "title": "Tech Talk", "start": "11:30" }
  ],
  "meta": {
    "date": "MON, MAR 16",
    "time": "14:32"
  }
}
```

---

# 🎨 Shared Base Template (REUSE THIS)

All layouts share this base wrapper:

```liquid
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://usetrmnl.com/css/latest/plugins.css">
  <style>
    body { font-family: sans-serif; }
    .big { font-size: 48px; font-weight: bold; }
    .medium { font-size: 28px; }
    .small { font-size: 18px; }
    .section { padding: 12px; }
    .divider { border-top: 2px solid #000; margin: 8px 0; }
  </style>
</head>
<body class="environment trmnl">
<div class="screen">
```

---

# 🖥️ 1. FULL SCREEN TEMPLATE

```liquid
<div class="section" style="height:50%;">
  <div class="small">NOW</div>
  <div class="big">
    {{ now.title | default: "FREE" }}
  </div>
  <div class="medium">
    {{ now.start }} – {{ now.end }}
  </div>
</div>

<div class="divider"></div>

<div class="section" style="height:25%;">
  <div class="small">NEXT</div>
  <div class="medium">{{ next.title }}</div>
  <div class="small">{{ next.start }} – {{ next.end }}</div>
</div>

<div class="divider"></div>

<div class="section" style="height:25%;">
  {% for item in later limit:3 %}
    <div class="small">• {{ item.title }} {{ item.start }}</div>
  {% endfor %}
</div>
```

---

# 📺 2. HALF HORIZONTAL (Top/Bottom)

```liquid
<div style="display:flex; flex-direction:column; height:100%;">

  <!-- TOP: NOW -->
  <div style="flex:1;" class="section">
    <div class="small">NOW</div>
    <div class="big">{{ now.title | default: "FREE" }}</div>
    <div class="medium">{{ now.start }} – {{ now.end }}</div>
  </div>

  <div class="divider"></div>

  <!-- BOTTOM -->
  <div style="flex:1; display:flex;">
    
    <!-- NEXT -->
    <div style="flex:1;" class="section">
      <div class="small">NEXT</div>
      <div class="medium">{{ next.title }}</div>
      <div class="small">{{ next.start }}</div>
    </div>

    <!-- LATER -->
    <div style="flex:1;" class="section">
      <div class="small">LATER</div>
      {% for item in later limit:2 %}
        <div class="small">• {{ item.title }}</div>
      {% endfor %}
    </div>

  </div>
</div>
```

---

# 📱 3. HALF VERTICAL (Left/Right)

```liquid
<div style="display:flex; height:100%;">

  <!-- LEFT: NOW -->
  <div style="flex:1;" class="section">
    <div class="small">NOW</div>
    <div class="big">{{ now.title | default: "FREE" }}</div>
    <div class="medium">{{ now.start }}</div>
  </div>

  <div style="width:2px; background:#000;"></div>

  <!-- RIGHT -->
  <div style="flex:1;" class="section">
    
    <div class="small">NEXT</div>
    <div class="medium">{{ next.title }}</div>

    <div class="divider"></div>

    <div class="small">LATER</div>
    {% for item in later limit:2 %}
      <div class="small">• {{ item.title }}</div>
    {% endfor %}
    
  </div>
</div>
```

---

# 🧩 4. QUADRANT LAYOUT

```liquid
<div style="display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; height:100%;">

  <!-- NOW -->
  <div class="section">
    <div class="small">NOW</div>
    <div class="big">{{ now.title | default: "FREE" }}</div>
  </div>

  <!-- NEXT -->
  <div class="section">
    <div class="small">NEXT</div>
    <div class="medium">{{ next.title }}</div>
    <div class="small">{{ next.start }}</div>
  </div>

  <!-- LATER -->
  <div class="section">
    <div class="small">LATER</div>
    {% for item in later limit:2 %}
      <div class="small">• {{ item.title }}</div>
    {% endfor %}
  </div>

  <!-- META -->
  <div class="section">
    <div class="medium">{{ meta.date }}</div>
    <div class="big">{{ meta.time }}</div>
  </div>

</div>
```

---

# ⚙️ How This Maps to TRMNL Plugin

## File Structure (BYOS or Plugin)

```id="1t1v0l"
src/
 ├── Template/
 │    ├── now_next_full.liquid
 │    ├── now_next_half_horizontal.liquid
 │    ├── now_next_half_vertical.liquid
 │    └── now_next_quadrant.liquid
 ├── Data/
 │    └── PrepareData.ts
```

---

## Switching Layouts

You can pass layout type:

```json
{
  "layout": "full"
}
```

Then in Liquid:

```liquid
{% if layout == "full" %}
  {% include "now_next_full" %}
{% elsif layout == "half_horizontal" %}
  {% include "now_next_half_horizontal" %}
{% endif %}
```

---

# 🚀 Bonus: Smart Enhancements (Worth Adding)

### 1. “Ends in X min”

Add in data:

```json
"now": {
  "endsIn": "1h 12m"
}
```

```liquid
<div class="small">Ends in {{ now.endsIn }}</div>
```

---

### 2. Empty State (VERY IMPORTANT)

```liquid
{{ now.title | default: "FREE" }}
```

---

### 3. Priority Highlight

```liquid
{% if now.title %}
  style="background:black; color:white;"
{% endif %}
```

---

# 🧠 Final Advice (from experience)

If you ship only ONE layout first:

👉 Ship **FULL SCREEN**

Because:

* Most readable
* Best demo impact
* Matches TRMNL philosophy (glanceability)

---

If you want next step, I can:

* Help you write **PrepareData.ts (calendar parsing logic)**
* Or build a **complete working repo based on byos_node_lite** with your plugin ready to deploy

[1]: https://github.com/usetrmnl/byos_node_lite?utm_source=chatgpt.com "GitHub - usetrmnl/byos_node_lite: Image server for TRMNL built with Node.js, JSX and HTML"
