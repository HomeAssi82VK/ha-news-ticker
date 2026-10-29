/* News Ticker Card 1.1.0 — adjustable label shapes and widths; RSS/backend unchanged. */
(() => {
  const VERSION = "1.1.0";
  const THEMES = {
    tv: { bg: "#13284b", fg: "#ffffff", accent: "#d52235", separator: "#ffcb44" },
    minimal: { bg: "#25272b", fg: "#f0f0f0", accent: "#636b74", separator: "#c0c0c0" },
    transparent: { bg: "transparent", fg: "var(--primary-text-color, #eee)", accent: "#278a9c", separator: "var(--secondary-text-color, #aaa)" },
  };
  const DEFAULT = {
    type: "custom:news-ticker-card",
    title: "NEWS",
    title_shape: "straight", title_width: null,
    feeds: [{ url: "https://www.tagesschau.de/index~rss2.xml", name: "Tagesschau", enabled: true }],
    theme: "minimal", mode: "continuous", speed: 62,
    interval: 6, height: 58, font_size: 15, max_items: 20,
    refresh_minutes: 10, show_source: true, show_clock: false,
    pause_on_hover: true, new_tab: true, exclude_keywords: "",
    colors: { bg: "#111923", fg: "#ffffff", accent: "#17c7d6", separator: "#f1a944" },
  };
  const isHex = (x) => typeof x === "string" && /^#[0-9a-f]{6}$/i.test(x);
  const clamp = (value, lo, hi, fallback) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
  };
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g,
    (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const safeLink = (url) => {
    try {
      const u = new URL(url);
      return ["http:", "https:"].includes(u.protocol) ? u.href : "";
    } catch (_) { return ""; }
  };
  const norm = (value = {}) => {
    const config = { ...DEFAULT, ...value };
    config.feeds = (Array.isArray(config.feeds) ? config.feeds : []).slice(0, 8).map((feed) => ({
      url: String(feed?.url ?? "").trim(),
      name: String(feed?.name ?? "").trim().slice(0, 60),
      enabled: feed?.enabled !== false,
    }));
    config.colors = { ...DEFAULT.colors, ...(config.colors || {}) };
    config.speed = clamp(config.speed, 20, 200, 62);
    config.interval = clamp(config.interval, 3, 20, 6);
    config.height = clamp(config.height, 38, 120, 58);
    config.font_size = clamp(config.font_size, 11, 26, 15);
    config.max_items = clamp(config.max_items, 1, 100, 20);
    config.refresh_minutes = clamp(config.refresh_minutes, 2, 60, 10);
    config.theme = [...Object.keys(THEMES), "custom"].includes(config.theme) ? config.theme : DEFAULT.theme;
    config.mode = ["continuous", "slide", "fade"].includes(config.mode) ? config.mode : DEFAULT.mode;
    // Existing News Ticker cards stay rectangular with automatic label width.
    config.title_shape = ["pointed", "rounded", "straight"].includes(config.title_shape) ? config.title_shape : "straight";
    config.title_width = config.title_width === null || config.title_width === undefined || config.title_width === ""
      ? null : Math.round(clamp(config.title_width, 55, 360, 140));
    return config;
  };
  const options = (entries, active) => entries.map(([v, label]) =>
    `<option value="${esc(v)}" ${v === active ? "selected" : ""}>${esc(label)}</option>`).join("");

  class NewsTickerCard extends HTMLElement {
    static getConfigElement() { return document.createElement("news-ticker-card-editor"); }
    static getStubConfig() { const { type, ...stub } = DEFAULT; return structuredClone(stub); }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this._items = [];
      this._errors = [];
      this._pending = false;
      this._fetchId = 0;
      this._index = 0;
      this._config = norm();
    }
    setConfig(config) {
      const oldFeeds = JSON.stringify({ feeds: this._config?.feeds, refresh: this._config?.refresh_minutes });
      this._config = norm(config);
      const newFeeds = JSON.stringify({ feeds: this._config.feeds, refresh: this._config.refresh_minutes });
      if (oldFeeds !== newFeeds) {
        this._items = [];
        this._errors = [];
        this._index = 0;
        this._schedule();
        this._fetch();
      }
      this._render();
    }
    set hass(hass) {
      const first = !this._hass;
      this._hass = hass;
      if (first) this._fetch();
    }
    connectedCallback() {
      this._schedule();
      if (this._hass && !this._items.length) this._fetch();
      this._render();
    }
    disconnectedCallback() {
      clearInterval(this._pollTimer);
      clearInterval(this._itemTimer);
      clearInterval(this._clockTimer);
      this._resizeObserver?.disconnect();
      this._resizeObserver = null;
    }
    getCardSize() { return Math.max(1, Math.ceil(this._config.height / 50)); }
    getGridOptions() { return { columns: 12, rows: 1, min_columns: 3, min_rows: 1 }; }

    _schedule() {
      clearInterval(this._pollTimer);
      if (this.isConnected) this._pollTimer = setInterval(() => this._fetch(), this._config.refresh_minutes * 60_000);
    }
    async _fetch() {
      if (!this._hass || !this.isConnected || this._pending) return;
      const sources = this._config.feeds.filter((f) => f.enabled && f.url);
      if (!sources.length) { this._items = []; this._errors = []; this._render(); return; }
      this._pending = true;
      const fetchId = ++this._fetchId;
      try {
        const response = await this._hass.callWS({
          type: "news_ticker/fetch",
          feeds: sources.map((f) => f.url),
          cache_seconds: this._config.refresh_minutes * 60,
        });
        if (fetchId !== this._fetchId) return;
        const items = [];
        const errors = [];
        (response.feeds || []).forEach((feed, ix) => {
          const src = sources[ix];
          if (feed.error) errors.push(`${src.name || src.url}: ${feed.error}`);
          for (const item of feed.items || []) {
            items.push({
              title: String(item.title || ""), link: safeLink(item.link),
              source: src.name || new URL(src.url).hostname,
              timestamp: Number(item.timestamp) || 0,
            });
          }
        });
        // Prefer recent headlines; undated feeds retain their original order.
        items.sort((a, b) => b.timestamp - a.timestamp);
        const exclude = String(this._config.exclude_keywords || "").toLocaleLowerCase("de")
          .split(",").map((x) => x.trim()).filter(Boolean);
        const unique = new Set();
        this._items = items.filter((item) => {
          if (!item.title || exclude.some((x) => item.title.toLocaleLowerCase("de").includes(x))) return false;
          const key = item.link || item.title;
          if (unique.has(key)) return false;
          unique.add(key);
          return true;
        }).slice(0, this._config.max_items);
        this._errors = errors;
      } catch (err) {
        this._errors = [String(err?.message || err || "RSS-Dienst nicht erreichbar")];
      } finally {
        this._pending = false;
        this._render();
      }
    }
    _colors() {
      if (this._config.theme !== "custom") return THEMES[this._config.theme];
      return Object.fromEntries(Object.entries(DEFAULT.colors).map(([key, value]) =>
        [key, isHex(this._config.colors[key]) ? this._config.colors[key] : value]));
    }
    _addLink(parent, item) {
      const el = document.createElement(item.link ? "a" : "span");
      el.className = "headline";
      el.textContent = item.title;
      if (item.link) {
        el.href = item.link;
        el.target = this._config.new_tab ? "_blank" : "_self";
        el.rel = "noopener noreferrer";
        el.title = item.title;
      }
      parent.append(el);
    }
    _fillGroup(group) {
      for (let i = 0; i < this._items.length; i++) {
        const item = this._items[i];
        const unit = document.createElement("span");
        unit.className = "unit";
        if (this._config.show_source) {
          const source = document.createElement("span");
          source.className = "source";
          source.textContent = item.source + ":";
          unit.append(source);
        }
        this._addLink(unit, item);
        group.append(unit);
        const sep = document.createElement("span");
        sep.className = "separator";
        sep.textContent = "✦";
        sep.setAttribute("aria-hidden", "true");
        group.append(sep);
      }
    }
    _clockUpdate() {
      const element = this.shadowRoot.querySelector(".clock");
      if (element) element.textContent = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date());
    }
    _showCurrent() {
      const container = this.shadowRoot.querySelector(".single");
      if (!container || !this._items.length) return;
      const item = this._items[this._index % this._items.length];
      const row = document.createElement("span");
      row.className = "single-inner";
      row.style.animationDuration = `${this._config.interval}s`;
      if (this._config.show_source) {
        const source = document.createElement("span");
        source.className = "source";
        source.textContent = item.source + ":";
        row.append(source);
      }
      this._addLink(row, item);
      container.replaceChildren(row);
    }
    _render() {
      clearInterval(this._itemTimer);
      clearInterval(this._clockTimer);
      this._resizeObserver?.disconnect();
      this._resizeObserver = null;
      const c = this._config;
      const colors = this._colors();
      const style = `--nt-bg:${colors.bg};--nt-fg:${colors.fg};--nt-accent:${colors.accent};--nt-separator:${colors.separator};--nt-height:${c.height}px;--nt-font:${c.font_size}px;${c.title_width === null ? "" : `--nt-title-width:${c.title_width}px;`}`;
      this.shadowRoot.innerHTML = `
        <style>
          :host { display:block; width:100%; max-width:100%; min-width:0; box-sizing:border-box; contain:inline-size; }
          ha-card { display:block; width:100%; max-width:100%; min-width:0; background:var(--nt-bg) !important; color:var(--nt-fg); overflow:hidden; box-sizing:border-box; }
          .bar { height:var(--nt-height); box-sizing:border-box; display:flex; align-items:center; width:100%; min-width:0; overflow:hidden; }
          .label { align-self:stretch; background:var(--nt-accent); color:#fff; padding:0 13px; display:flex; align-items:center; justify-content:center; text-transform:uppercase; letter-spacing:.08em; font-size:12px; font-weight:800; white-space:nowrap; max-width:32%; flex-shrink:0; z-index:1; box-sizing:border-box; min-width:0; overflow:hidden; text-overflow:ellipsis; }
          /* Pointed shape reserves its tip inside the assigned width. */
          .label.shape-pointed { clip-path:polygon(0 0,calc(100% - 13px) 0,100% 50%,calc(100% - 13px) 100%,0 100%); padding-right:26px; }
          .label.shape-rounded { border-radius:0 999px 999px 0; padding-right:19px; }
          .label.shape-straight { border-radius:0; }
          /* Fixed width wins over flex sizing and natural label width; never change the ticker viewport width calculation. */
          .label.fixed-width { width:var(--nt-title-width); flex:0 0 var(--nt-title-width); max-width:min(var(--nt-title-width), calc(100% - 42px)); }
          .viewport { position:relative; flex:1; min-width:0; overflow:hidden; display:flex; align-items:center; height:100%; }
          .track { position:absolute; left:0; top:0; height:100%; display:flex; align-items:center; white-space:nowrap; width:max-content; will-change:transform; animation:nt-marquee var(--duration,40s) linear infinite; }
          .group { display:flex; flex:none; align-items:center; white-space:nowrap; padding-right:22px; box-sizing:border-box; }
          .unit,.single-inner { display:inline-flex; gap:8px; align-items:center; white-space:nowrap; }
          .headline { font-size:var(--nt-font); font-weight:550; line-height:1.4; color:var(--nt-fg); text-decoration:none; }
          a.headline:hover { text-decoration:underline; }
          .source { color:var(--nt-separator); font-size:calc(var(--nt-font) * .82); font-weight:700; }
          .separator { color:var(--nt-separator); padding:0 20px; font-size:calc(var(--nt-font) * .9); }
          .single { display:flex; height:100%; align-items:center; overflow:hidden; width:100%; padding:0 12px; box-sizing:border-box; }
          .single-inner { max-width:100%; white-space:nowrap; }
          .mode-slide .single-inner { animation:nt-slide ease-in-out both; }
          .mode-fade .single-inner { animation:nt-fade ease-in-out both; }
          .clock { align-self:stretch; display:flex; flex:0 0 auto; white-space:nowrap; align-items:center; padding:0 10px; border-left:1px solid color-mix(in srgb, var(--nt-fg) 15%, transparent); font-variant-numeric:tabular-nums; font-size:calc(var(--nt-font) * .84); font-weight:700; z-index:1; }
          .empty { padding:0 15px; color:var(--nt-fg); opacity:.8; font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
          .loading { opacity:.7; }
          @keyframes nt-marquee { from {transform:translateX(0)} to {transform:translateX(calc(-1 * var(--distance,100px)))} }
          @keyframes nt-slide { 0% { transform:translateX(100%); opacity:0; } 15%,77% { transform:translateX(0); opacity:1; } 100% { transform:translateX(-35%); opacity:0; } }
          @keyframes nt-fade { 0%,100% {opacity:0} 12%,82% {opacity:1} }
          ${c.pause_on_hover ? ".bar:hover .track, .bar:hover .single-inner {animation-play-state:paused;}" : ""}
          @media (prefers-reduced-motion:reduce) { .track,.single-inner {animation:none !important;} .group.copy {display:none} }
        </style>
        <ha-card style="${esc(style)}">
          <div class="bar mode-${esc(c.mode)}">
            ${c.title ? `<div class="label shape-${esc(c.title_shape)}${c.title_width !== null ? " fixed-width" : ""}" title="${esc(c.title)}">${esc(c.title)}</div>` : ""}
            <div class="viewport" aria-label="Nachrichtenticker"></div>
            ${c.show_clock ? `<div class="clock" aria-label="Uhrzeit"></div>` : ""}
          </div>
        </ha-card>`;
      const bar = this.shadowRoot.querySelector(".bar");
      bar.addEventListener("mouseenter", () => { this._hovered = true; });
      bar.addEventListener("mouseleave", () => { this._hovered = false; });
      const viewport = this.shadowRoot.querySelector(".viewport");
      if (!c.feeds.some((f) => f.url && f.enabled)) {
        viewport.innerHTML = `<div class="empty">RSS-Quelle im Karteneditor hinzufügen</div>`;
      } else if (!this._items.length) {
        const msg = this._errors.length ? `Keine Schlagzeilen: ${this._errors.join(" | ")}` : this._pending ? "Schlagzeilen werden geladen …" : "Keine Schlagzeilen gefunden";
        const placeholder = document.createElement("div");
        placeholder.className = "empty" + (!this._errors.length ? " loading" : "");
        placeholder.textContent = msg;
        viewport.append(placeholder);
      } else if (c.mode === "continuous") {
        const track = document.createElement("div");
        track.className = "track";
        const group = document.createElement("div");
        group.className = "group";
        this._fillGroup(group);
        track.append(group);
        const copy = group.cloneNode(true);
        copy.classList.add("copy");
        copy.setAttribute("aria-hidden", "true");
        track.append(copy);
        viewport.append(track);
        const size = () => {
          if (!group.isConnected) return;
          // Make one complete group at least as wide as the viewport. A short
          // single headline would otherwise leave an empty stretch before
          // its duplicate enters the visible area.
          const viewportWidth = Math.max(1, viewport.clientWidth);
          group.replaceChildren();
          this._fillGroup(group);
          const original = Array.from(group.childNodes).map((node) => node.cloneNode(true));
          let repeats = 0;
          while (group.scrollWidth < viewportWidth && repeats < 60) {
            for (const node of original) group.append(node.cloneNode(true));
            repeats++;
          }
          // The trailing copy must contain the EXACT same text and width.
          copy.replaceChildren(...Array.from(group.childNodes, (node) => node.cloneNode(true)));
          const distance = group.getBoundingClientRect().width;
          track.style.setProperty("--distance", `${distance}px`);
          track.style.setProperty("--duration", `${Math.max(3, distance / c.speed)}s`);
        };
        requestAnimationFrame(size);
        if (typeof ResizeObserver !== "undefined") {
          this._resizeObserver = new ResizeObserver(size);
          this._resizeObserver.observe(viewport);
        }
      } else {
        const single = document.createElement("div");
        single.className = "single";
        viewport.append(single);
        this._showCurrent();
        if (this._items.length > 1) this._itemTimer = setInterval(() => {
          if (this._config.pause_on_hover && this._hovered) return;
          this._index = (this._index + 1) % this._items.length;
          this._showCurrent();
        }, c.interval * 1000);
      }
      if (c.show_clock) {
        this._clockUpdate();
        this._clockTimer = setInterval(() => this._clockUpdate(), 15000);
      }
    }
  }

  class NewsTickerCardEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: "open" }); this._config = norm(); }
    setConfig(config) { this._config = norm(config); this._render(); }
    set hass(hass) { this._hass = hass; }

    _change(patch) {
      this._config = norm({ ...this._config, ...patch });
      this.dispatchEvent(new CustomEvent("config-changed", {
        detail: { config: structuredClone(this._config) }, bubbles: true, composed: true,
      }));
      this._render();
    }
    _changeFeed(index, field, value) {
      const feeds = this._config.feeds.map((feed) => ({ ...feed }));
      feeds[index][field] = value;
      this._change({ feeds });
    }
    _feedRow(feed, index) {
      return `<div class="feed" data-index="${index}">
        <div class="feed-head"><strong>Quelle ${index + 1}</strong>
          <div class="tools"><button data-move="up" title="Nach oben" ${index === 0 ? "disabled" : ""}>↑</button>
          <button data-move="down" title="Nach unten" ${index === this._config.feeds.length - 1 ? "disabled" : ""}>↓</button>
          <button data-test title="RSS-Adresse prüfen">Prüfen</button>
          <button data-remove title="Quelle entfernen">✕</button></div></div>
        <label>Name (optional)<input data-feed="name" type="text" maxlength="60" placeholder="z. B. Tagesschau" value="${esc(feed.name)}"></label>
        <label>RSS- oder Atom-URL<input data-feed="url" type="url" placeholder="https://…/rss.xml" value="${esc(feed.url)}"></label>
        <label class="checkbox"><input data-feed="enabled" type="checkbox" ${feed.enabled ? "checked" : ""}> Quelle aktiv</label>
        <div class="test-result" aria-live="polite"></div>
      </div>`;
    }
    _render() {
      const c = this._config;
      this.shadowRoot.innerHTML = `<style>
        :host { display:block; color:var(--primary-text-color); font:inherit; }
        .editor { display:grid; gap:15px; padding:6px 2px 16px; }
        h3 { margin:10px 0 1px; font-size:15px; font-weight:650; border-bottom:1px solid var(--divider-color,#9994); padding-bottom:7px; }
        .grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
        label { display:grid; gap:5px; font-size:12px; font-weight:600; }
        input:not([type=checkbox]), select { box-sizing:border-box; min-width:0; width:100%; font:inherit; font-size:14px; border:1px solid var(--divider-color,#9aa); color:var(--primary-text-color); background:var(--card-background-color,#fff); border-radius:8px; padding:9px; }
        input[type=color] { min-height:42px; padding:4px; }
        input[type=range] { accent-color:var(--primary-color,#14bdcd); height:25px; padding:0; border:none; background:transparent; cursor:pointer; }
        .width-controls { display:grid; gap:7px; }
        .width-value { font-variant-numeric:tabular-nums; font-weight:700; }
        .width-grid { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:8px; align-items:end; }
        .width-grid button { height:39px; }
        .title-preview { display:flex; align-items:center; min-width:0; overflow:hidden; height:47px; border-radius:9px; border:1px solid var(--divider-color,#9995); background:var(--nt-preview-bg,#101923); color:var(--nt-preview-fg,#fff); }
        .title-preview .preview-label { display:flex; align-items:center; justify-content:center; flex:0 0 auto; min-width:0; max-width:calc(100% - 35px); box-sizing:border-box; overflow:hidden; white-space:nowrap; padding:0 13px; height:100%; font-size:12px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; background:var(--nt-preview-accent,#14bdcd); color:white; }
        .title-preview .preview-label.shape-pointed { clip-path:polygon(0 0,calc(100% - 13px) 0,100% 50%,calc(100% - 13px) 100%,0 100%); padding-right:26px; }
        .title-preview .preview-label.shape-rounded { border-radius:0 999px 999px 0; padding-right:19px; }
        .title-preview .preview-label.shape-straight { border-radius:0; }
        .preview-news { padding:0 12px; white-space:nowrap; opacity:.85; font-size:12px; }
        @media(max-width:420px) { .grid { grid-template-columns:1fr; } }
        .checkbox { display:flex; flex-direction:row; align-items:center; gap:9px; padding:3px 0; font-size:13px; font-weight:500; }
        input[type=checkbox] { accent-color:var(--primary-color); width:17px; height:17px; }
        .feed { border:1px solid var(--divider-color,#9995); border-radius:10px; padding:10px; display:grid; gap:9px; }
        .feed-head { display:flex; justify-content:space-between; align-items:center; gap:5px; }
        .tools { display:flex; gap:3px; }
        button { padding:7px 10px; cursor:pointer; color:var(--primary-text-color); background:var(--secondary-background-color,#aaa2); border:1px solid var(--divider-color,#8885); border-radius:7px; }
        button:disabled { opacity:.35; cursor:default; }
        .add { width:100%; font-weight:700; padding:11px; border:1px dashed var(--primary-color,#09a); }
        .hint,.test-result { font-size:12px; color:var(--secondary-text-color,#888); line-height:1.5; }
        .test-result:not(:empty) { padding:8px; border-radius:7px; background:var(--secondary-background-color,#7771); }
      </style><div class="editor">
        <h3>RSS-Quellen</h3>
        ${c.feeds.map((feed, index) => this._feedRow(feed,index)).join("")}
        <button class="add" data-add ${c.feeds.length >= 8 ? "disabled" : ""}>+ RSS-Quelle hinzufügen</button>
        <div class="hint">Bis zu 8 Quellen pro Karte. Ein Klick auf „Prüfen“ testet den Feed über Home Assistant.</div>
        <h3>Design</h3>
        <label>Theme<select data-field="theme">${options([
          ["tv","TV News Classic"],
          ["minimal","Minimal Dark"], ["transparent","Transparent"],
          ["custom","Eigene Farben"]], c.theme)}</select></label>
        <label>Titel / Senderkennung<input data-field="title" type="text" maxlength="25" placeholder="NEWS" value="${esc(c.title)}"></label>
        <label>Form des Titelfelds<select data-field="title_shape">${options([
          ["pointed","Spitz"], ["rounded","Rund"], ["straight","Gerade"]
        ],c.title_shape)}</select></label>
        <div class="width-controls">
          <label for="nt-design-width">Titelbreite <span class="width-value" data-width-value>${c.title_width === null ? "Automatisch" : `${c.title_width} px`}</span></label>
          <input id="nt-design-width" type="range" min="55" max="360" step="1" data-title-width value="${c.title_width ?? 140}" aria-label="Titelbreite in Pixeln">
          <div class="width-grid">
            <label>Breite genau (px)<input type="number" data-width-number min="55" max="360" placeholder="Automatisch" value="${c.title_width ?? ""}"></label>
            <button type="button" data-width-reset ${c.title_width === null ? "disabled" : ""}>Automatisch</button>
          </div>
          <div class="hint">Feste Breite von 55–360 px oder automatisch wie bisher.</div>
          <div class="title-preview" style="--nt-preview-bg:${esc(c.theme === "custom" ? c.colors.bg : THEMES[c.theme].bg)};--nt-preview-fg:${esc(c.theme === "custom" ? c.colors.fg : THEMES[c.theme].fg)};--nt-preview-accent:${esc(c.theme === "custom" ? c.colors.accent : THEMES[c.theme].accent)}">
            <span class="preview-label shape-${esc(c.title_shape)}" style="${c.title_width === null ? "" : `width:${c.title_width}px;`}">${esc(c.title || "NEWS")}</span>
            <span class="preview-news">Schlagzeile läuft hier …</span>
          </div>
        </div>
        ${c.theme === "custom" ? `<div class="grid">${[
          ["bg","Hintergrund"],["fg","Schrift"],["accent","Ticker-Label"],["separator","Quelle & Trenner"]]
          .map(([k,l]) => `<label>${l}<input type="color" data-color="${k}" value="${isHex(c.colors[k]) ? c.colors[k] : DEFAULT.colors[k]}"></label>`).join("")}</div>` : ""}
        <div class="grid">
          <label>Höhe (px)<input data-field="height" type="number" min="38" max="120" value="${c.height}"></label>
          <label>Schriftgröße (px)<input data-field="font_size" type="number" min="11" max="26" value="${c.font_size}"></label>
        </div>
        <h3>Animation</h3>
        <label>Bewegung<select data-field="mode">${options([
          ["continuous","Endlos laufende Laufschrift"], ["slide","Einzeln ein-/ausfahren"],
          ["fade","Einzeln überblenden"]], c.mode)}</select></label>
        ${c.mode === "continuous" ? `<label>Geschwindigkeit (Pixel/Sek.)<input data-field="speed" type="number" min="20" max="200" step="5" value="${c.speed}"></label>` :
          `<label>Anzeigedauer pro Schlagzeile (Sek.)<input data-field="interval" type="number" min="3" max="20" value="${c.interval}"></label>`}
        <label class="checkbox"><input data-bool="pause_on_hover" type="checkbox" ${c.pause_on_hover ? "checked" : ""}> Bei Mausberührung pausieren</label>
        <h3>Nachrichten</h3>
        <div class="grid">
          <label>Aktualisierung (Min.)<input data-field="refresh_minutes" type="number" min="2" max="60" value="${c.refresh_minutes}"></label>
          <label>Max. Schlagzeilen<input data-field="max_items" type="number" min="1" max="100" value="${c.max_items}"></label>
        </div>
        <label>Ausschlusswörter, durch Komma getrennt<input data-field="exclude_keywords" type="text" placeholder="z. B. Fußball, Börse" value="${esc(c.exclude_keywords)}"></label>
        <label class="checkbox"><input data-bool="show_source" type="checkbox" ${c.show_source ? "checked" : ""}> Quellenname anzeigen</label>
        <label class="checkbox"><input data-bool="show_clock" type="checkbox" ${c.show_clock ? "checked" : ""}> Uhrzeit rechts anzeigen</label>
        <label class="checkbox"><input data-bool="new_tab" type="checkbox" ${c.new_tab ? "checked" : ""}> Artikel in neuem Tab öffnen</label>
        <div class="hint">Die Karte zeigt nur die Überschriften. Links führen zu den Originalartikeln. Daten werden vom HA-Server zwischengespeichert.</div>
      </div>`;
      const widthSlider = this.shadowRoot.querySelector("[data-title-width]");
      widthSlider?.addEventListener("input", () => {
        const value = widthSlider.value;
        this.shadowRoot.querySelector("[data-width-value]").textContent = `${value} px`;
        this.shadowRoot.querySelector("[data-width-number]").value = value;
        const preview = this.shadowRoot.querySelector(".title-preview .preview-label");
        if (preview) preview.style.width = `${value}px`;
      });
      widthSlider?.addEventListener("change", () => this._change({ title_width: Number(widthSlider.value) }));
      this.shadowRoot.querySelector("[data-width-number]")?.addEventListener("change", (event) => {
        const value = event.target.value;
        this._change({ title_width: value === "" ? null : Number(value) });
      });
      this.shadowRoot.querySelector("[data-width-reset]")?.addEventListener("click", () => this._change({ title_width: null }));
      this.shadowRoot.querySelectorAll("[data-field]").forEach((input) => {
        input.addEventListener("change", () => this._change({ [input.dataset.field]: input.value }));
      });
      this.shadowRoot.querySelectorAll("[data-bool]").forEach((input) => {
        input.addEventListener("change", () => this._change({ [input.dataset.bool]: input.checked }));
      });
      this.shadowRoot.querySelectorAll("[data-color]").forEach((input) => {
        input.addEventListener("change", () => this._change({ colors: { ...this._config.colors, [input.dataset.color]: input.value } }));
      });
      this.shadowRoot.querySelectorAll(".feed").forEach((row) => {
        const index = Number(row.dataset.index);
        row.querySelectorAll("[data-feed]").forEach((input) => {
          input.addEventListener("change", () => this._changeFeed(index, input.dataset.feed,
            input.type === "checkbox" ? input.checked : input.value));
        });
        row.querySelector("[data-remove]").addEventListener("click", () =>
          this._change({ feeds: this._config.feeds.filter((_, i) => i !== index) }));
        row.querySelectorAll("[data-move]").forEach((button) => button.addEventListener("click", () => {
          const dest = index + (button.dataset.move === "up" ? -1 : 1);
          if (dest < 0 || dest >= this._config.feeds.length) return;
          const feeds = [...this._config.feeds];
          [feeds[index], feeds[dest]] = [feeds[dest], feeds[index]];
          this._change({ feeds });
        }));
        row.querySelector("[data-test]").addEventListener("click", async () => {
          const result = row.querySelector(".test-result");
          const source = this._config.feeds[index];
          if (!source.url) { result.textContent = "Bitte eine URL eingeben."; return; }
          if (!this._hass) { result.textContent = "Keine Verbindung zu Home Assistant."; return; }
          result.textContent = "Quelle wird geprüft …";
          try {
            const response = await this._hass.callWS({ type:"news_ticker/fetch", feeds:[source.url], cache_seconds:120 });
            const feed = response.feeds?.[0];
            if (!result.isConnected) return;
            result.textContent = feed?.error ? `Fehler: ${feed.error}` :
              `✓ Quelle erreichbar: ${feed?.items?.length || 0} Schlagzeilen gefunden.`;
          } catch (error) {
            if (result.isConnected) result.textContent = `Fehler: ${error.message || error}`;
          }
        });
      });
      this.shadowRoot.querySelector("[data-add]").addEventListener("click", () => {
        if (c.feeds.length >= 8) return;
        this._change({ feeds: [...this._config.feeds, { url:"", name:"", enabled:true }] });
      });
    }
  }

  if (!customElements.get("news-ticker-card")) customElements.define("news-ticker-card", NewsTickerCard);
  if (!customElements.get("news-ticker-card-editor")) customElements.define("news-ticker-card-editor", NewsTickerCardEditor);
  // Registration for Home Assistant's "By card" / Community card picker.
  // Do not request a live preview here: RSS data and the integration may not
  // yet be available when the card-picker dialog builds its catalogue.
  if (!Array.isArray(window.customCards)) window.customCards = [];
  const cardMetadata = {
    type: "news-ticker-card",
    name: "News Ticker Card",
    description: "RSS/Atom-Nachrichtenticker mit einstellbarer Titelform und Titelbreite",
    preview: false,
  };
  const existingCard = window.customCards.find((entry) => entry?.type === cardMetadata.type);
  if (existingCard) Object.assign(existingCard, cardMetadata);
  else window.customCards.push(cardMetadata);
  console.info(`%c NEWS TICKER CARD %c ${VERSION} `, "background:#14bdcd;color:#111;font-weight:700", "background:#18242e;color:#fff");
})();
