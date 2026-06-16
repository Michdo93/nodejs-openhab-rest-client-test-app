import {
  OpenHABClient,
  Items, Things, Rules, Actions, Addons,
  Audio, Auth, ChannelTypes, ConfigDescriptions,
  Discovery, Iconsets, Inbox, Links, Logging,
  ModuleTypes, Persistence, ProfileTypes,
  Services, Sitemaps, Systeminfo, Tags,
  Templates, ThingTypes, Transformations,
  UI, UUID, Voice, ItemEvents
} from 'nodejs-openhab-rest-client';

// Globale Variablen für State
let client = null;
let currentSection = 0;
let activeEventStream = null;

// Statistik Zähler
let statTotal = 0;
let statPass  = 0;
let statFail  = 0;
let statRun   = 0;

// Konstanten für Standardwerte
const TEST_ITEM        = "testSwitch";
const TEST_NUMBER_ITEM = "testNumber";
const TEST_GROUP       = "Static";
const TEST_THING_UID   = "astro:sun:b54938fe5c";
const TEST_LOGGER      = "org.openhab.test.js";
const TEST_RULE_UID    = "test_color-4";

// DOM-Elemente
const logList = document.getElementById("log-list");
const sidebar = document.getElementById("sidebar");
const sectionTitle = document.getElementById("section-title");
const cardsList = document.getElementById("cards-list");
const sseMonitor = document.getElementById("sse-monitor");
const sseLog = document.getElementById("sse-log");

// Hilfsfunktionen für Log-Monitor
function logINFO(msg) { appendLog(msg, "info"); }
function logERR(msg)  { appendLog(msg, "err"); }
function logSSE(msg)  { appendLog(msg, "sse"); }

function appendLog(msg, type) {
  if (!logList) return;
  const li = document.createElement("li");
  li.className = `log-line log-${type}`;
  li.innerHTML = `<span class="log-time">${new Date().toLocaleTimeString()}</span> <span class="log-msg">${msg}</span>`;
  logList.appendChild(li);
  logList.scrollTop = logList.scrollHeight;
}

function updateStats() {
  document.getElementById("stat-total").innerText = statTotal;
  document.getElementById("stat-pass").innerText = statPass;
  document.getElementById("stat-fail").innerText = statFail;
  document.getElementById("stat-run").innerText = statRun;
}

// ─── INITIALISIERUNG & LOGIN ────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  const connectBtn = document.getElementById("connect-btn");
  const clearBtn = document.getElementById("clear-btn");
  const stopSseBtn = document.getElementById("stop-sse-btn");

  if (connectBtn) {
    connectBtn.addEventListener("click", async () => {
      const url = document.getElementById("url-input").value;
      const user = document.getElementById("user-input").value;
      const pass = document.getElementById("pass-input").value;
      const token = document.getElementById("token-input").value || null;

      try {
        logINFO(`Verbinde mit ${url}...`);
        client = new OpenHABClient(url, user, pass, token);
        
        if (typeof client.login === "function") {
          await client.login();
        }
        
        logINFO("✅ Erfolgreich mit openHAB verbunden!");
        alert("Erfolgreich verbunden!");
      } catch (err) {
        logERR(`❌ Verbindung fehlgeschlagen: ${err.message}`);
      }
    });
  }

  if (clearBtn) {
    clearBtn.addEventListener("click", () => { if (logList) logList.innerHTML = ""; });
  }

  if (stopSseBtn) {
    stopSseBtn.addEventListener("click", () => {
      if (activeEventStream) {
        activeEventStream.cancel();
        activeEventStream = null;
        logSSE("■ Stream manuell gestoppt.");
        sseMonitor.classList.remove("active");
      }
    });
  }

  buildNav();
  logINFO("js-openhab-rest-client Testsuite geladen.");
  logINFO("1. Zugangsdaten oben prüfen.");
  logINFO("2. Auf 'Verbinden' klicken.");
  logINFO("3. Klasse wählen & Endpunkte testen.");
});

// Fenster-Methode zum Expandieren der Kartenparameter
window.toggleParams = function(head) {
  const params = head.nextElementSibling;
  params.classList.toggle("open");
};

// Test Runner Logik
async function runTest(cardHead, fn, name, num) {
  const card = cardHead.closest(".test-card");
  const badge = cardHead.querySelector(".badge");
  const pre = card.querySelector(".test-result");

  card.classList.remove("success", "error");
  card.classList.add("running");
  badge.className = "badge status-running";
  badge.innerText = "RUNNING";
  pre.style.display = "none";
  pre.innerText = "";

  statRun++;
  statTotal++;
  updateStats();

  logINFO(`[#${num}] Starte: ${name}...`);
  const start = performance.now();

  try {
    const res = await fn();
    const diff = (performance.now() - start).toFixed(0);
    
    card.classList.add("success");
    badge.className = "badge status-success";
    badge.innerText = `OK (${diff}ms)`;
    
    pre.style.display = "block";
    pre.innerText = typeof res === "object" ? JSON.stringify(res, null, 2) : String(res);
    logINFO(`[#${num}] ✅ ${name} beendet.`);
    statPass++;
  } catch (err) {
    card.classList.add("error");
    badge.className = "badge status-error";
    badge.innerText = "ERROR";
    
    pre.style.display = "block";
    pre.innerText = err.stack || err.message;
    logERR(`[#${num}] ❌ ${name} fehlgeschlagen: ${err.message}`);
    statFail++;
  } finally {
    card.classList.remove("running");
    statRun--;
    updateStats();
  }
}

// ─── ALLE 64 ENDPUNKTE ALS SECTIONS DEFINIERT ────────────────────────────────
const sections = [
  {
    title: "Core APIs",
    tests: [
      { name: "getUUID", btnLabel: "Get UUID", btnColor: "btn-blue", fn: async () => await new UUID(client).getUUID() },
      { name: "getSystemInfo", btnLabel: "Get Systeminfo", btnColor: "btn-blue", fn: async () => await new Systeminfo(client).getSystemInfo() }
    ]
  },
  {
    title: "Items API",
    tests: [
      { name: "getItems", btnLabel: "Get Items", btnColor: "btn-green", fn: async () => await new Items(client).getItems() },
      { name: "createOrUpdateItem", btnLabel: "Create/Update Item", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).createOrUpdateItem(p.itemName, { type: "Switch", name: p.itemName, label: "Test Schalter" }) },
      { name: "getItem", btnLabel: "Get Item", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).getItem(p.itemName) },
      { name: "getItemMetadata", btnLabel: "Get Metadata", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).getItemMetadata(p.itemName) },
      { name: "addItemMetadata", btnLabel: "Add Metadata", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).addItemMetadata(p.itemName, "testNamespace", { value: "hello" }) },
      { name: "removeItemMetadata", btnLabel: "Remove Metadata", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).removeItemMetadata(p.itemName, "testNamespace") },
      { name: "getItemGroupMembers", btnLabel: "Get Members", btnColor: "btn-green", params: [{ key: "groupName", default: TEST_GROUP }], fn: async (p) => await new Items(client).getItemGroupMembers(p.groupName) },
      { name: "addMemberToGroup", btnLabel: "Add to Group", btnColor: "btn-green", params: [{ key: "groupName", default: TEST_GROUP }, { key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).addMemberToGroup(p.groupName, p.itemName) },
      { name: "removeMemberFromGroup", btnLabel: "Remove from Group", btnColor: "btn-green", params: [{ key: "groupName", default: TEST_GROUP }, { key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).removeMemberFromGroup(p.groupName, p.itemName) },
      { name: "getItemState", btnLabel: "Get State", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).getItemState(p.itemName) },
      { name: "sendCommand", btnLabel: "Send Command", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }, { key: "cmd", default: "ON" }], fn: async (p) => await new Items(client).sendCommand(p.itemName, p.cmd) },
      { name: "postState", btnLabel: "Post State", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }, { key: "state", default: "OFF" }], fn: async (p) => await new Items(client).postState(p.itemName, p.state) },
      { name: "deleteItemState", btnLabel: "Delete State", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).deleteItemState(p.itemName) },
      { name: "deleteItem", btnLabel: "Delete Item", btnColor: "btn-green", params: [{ key: "itemName", default: TEST_ITEM }], fn: async (p) => await new Items(client).deleteItem(p.itemName) }
    ]
  },
  {
    title: "Things API",
    tests: [
      { name: "getThings", btnLabel: "Get Things", btnColor: "btn-purple", fn: async () => await new Things(client).getThings() },
      { name: "getThing", btnLabel: "Get Thing", btnColor: "btn-purple", params: [{ key: "thingUID", default: TEST_THING_UID }], fn: async (p) => await new Things(client).getThing(p.thingUID) },
      { name: "getThingConfig", btnLabel: "Get Config", btnColor: "btn-purple", params: [{ key: "thingUID", default: TEST_THING_UID }], fn: async (p) => await new Things(client).getThingConfig(p.thingUID) },
      { name: "updateThingConfig", btnLabel: "Update Config", btnColor: "btn-purple", params: [{ key: "thingUID", default: TEST_THING_UID }], fn: async (p) => await new Things(client).updateThingConfig(p.thingUID, {}) },
      { name: "getThingStatus", btnLabel: "Get Status", btnColor: "btn-purple", params: [{ key: "thingUID", default: TEST_THING_UID }], fn: async (p) => await new Things(client).getThingStatus(p.thingUID) },
      { name: "getThingFirmwares", btnLabel: "Get Firmwares", btnColor: "btn-purple", params: [{ key: "thingUID", default: TEST_THING_UID }], fn: async (p) => await new Things(client).getThingFirmwares(p.thingUID) }
    ]
  },
  {
    title: "Rules API",
    tests: [
      { name: "getRules", btnLabel: "Get Rules", btnColor: "btn-yellow", fn: async () => await new Rules(client).getRules() },
      { name: "getRule", btnLabel: "Get Rule", btnColor: "btn-yellow", params: [{ key: "ruleUID", default: TEST_RULE_UID }], fn: async (p) => await new Rules(client).getRule(p.ruleUID) },
      { name: "getRuleStatus", btnLabel: "Get Status", btnColor: "btn-yellow", params: [{ key: "ruleUID", default: TEST_RULE_UID }], fn: async (p) => await new Rules(client).getRuleStatus(p.ruleUID) },
      { name: "runRule", btnLabel: "Trigger Rule", btnColor: "btn-yellow", params: [{ key: "ruleUID", default: TEST_RULE_UID }], fn: async (p) => await new Rules(client).runRule(p.ruleUID, { data: "test" }) },
      { name: "enableRule", btnLabel: "Enable Rule", btnColor: "btn-yellow", params: [{ key: "ruleUID", default: TEST_RULE_UID }, { key: "enable", default: "true" }], fn: async (p) => await new Rules(client).enableRule(p.ruleUID, p.enable === "true") }
    ]
  },
  {
    title: "Sitemaps & Framework",
    tests: [
      { name: "getSitemaps", btnLabel: "Get Sitemaps", btnColor: "btn-blue", fn: async () => await new Sitemaps(client).getSitemaps() },
      { name: "getServices", btnLabel: "Get Services", btnColor: "btn-blue", fn: async () => await new Services(client).getServices() },
      { name: "getAddons", btnLabel: "Get Addons", btnColor: "btn-blue", fn: async () => await new Addons(client).getAddons() },
      { name: "getIconsets", btnLabel: "Get Iconsets", btnColor: "btn-blue", fn: async () => await new Iconsets(client).getIconsets() },
      { name: "getLinks", btnLabel: "Get Links", btnColor: "btn-blue", fn: async () => await new Links(client).getLinks() }
    ]
  },
  {
    title: "Logging & System",
    tests: [
      { name: "getLoggers", btnLabel: "Get Loggers", btnColor: "btn-purple", fn: async () => await new Logging(client).getLoggers() },
      { name: "getLogger", btnLabel: "Get Logger", btnColor: "btn-purple", params: [{ key: "logger", default: TEST_LOGGER }], fn: async (p) => await new Logging(client).getLogger(p.logger) },
      { name: "setLoggerLevel", btnLabel: "Set Level", btnColor: "btn-purple", params: [{ key: "logger", default: TEST_LOGGER }, { key: "level", default: "INFO" }], fn: async (p) => await new Logging(client).setLoggerLevel(p.logger, p.level) },
      { name: "getDiscoveryMethods", btnLabel: "Get Discovery", btnColor: "btn-blue", fn: async () => await new Discovery(client).getDiscoveryMethods() }
    ]
  },
  {
    title: "Event Streaming (SSE)",
    isSSE: true,
    tests: [
      {
        name: "Lausche auf Live-Events (SSE)",
        btnLabel: "Live Stream starten",
        btnColor: "btn-purple",
        fn: async () => {
          if (activeEventStream) activeEventStream.cancel();
          
          sseLog.innerHTML = "";
          sseMonitor.classList.add("active");
          logSSE("⚡ Verbindung zum Event-Stream hergestellt. Lausche...");

          activeEventStream = new ItemEvents(client);
          
          // Starte den asynchronen Generator aus deiner Library im Browser
          (async () => {
            try {
              for await (const event of activeEventStream.listen()) {
                const div = document.createElement("div");
                div.style.padding = "2px 0";
                div.innerText = `[${new Date().toLocaleTimeString()}] ${event.type || 'Event'}: ${event.payload || ''}`;
                sseLog.appendChild(div);
                sseLog.scrollTop = sseLog.scrollHeight;
              }
            } catch (err) {
              logERR("SSE Stream abgebrochen: " + err.message);
            }
          })();

          return "SSE-Stream im Floating Monitor aktiv. Nutze ein anderes Fenster, um Schalter umzulegen!";
        }
      }
    ]
  }
];

// ─── SIDEBAR & UI RENDERING LOGIK ───────────────────────────────────────────
function buildNav() {
  if (!sidebar) return;
  sidebar.innerHTML = `<div class="sidebar-head">REST-Klassen</div>`;

  sections.forEach((s, idx) => {
    const item = document.createElement("div");
    item.className = `nav-item ${idx === currentSection ? 'active' : ''}`;
    item.innerHTML = `<span>${s.title}</span><span class="nav-count">${s.tests.length}</span>`;
    
    item.addEventListener("click", () => {
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      item.classList.add("active");
      currentSection = idx;
      showSection(idx);
    });
    
    sidebar.appendChild(item);
  });

  showSection(currentSection);
}

function showSection(idx) {
  const s = sections[idx];
  if (!s || !cardsList) return;

  sectionTitle.innerText = s.title;
  cardsList.innerHTML = "";

  s.tests.forEach((t, i) => {
    const card = document.createElement("div");
    card.className = "test-card";

    let paramFields = "";
    if (t.params) {
      paramFields = t.params.map(p => `
        <div class="param-field">
          <label>${p.key}:</label>
          <input type="text" class="param-input" data-key="${p.key}" value="${p.default || ''}">
        </div>
      `).join("");
    }

    const btnColor = t.btnColor || "btn-blue";
    const btnLabel = t.btnLabel || "Ausführen";

    card.innerHTML = `
      <div class="test-card-head" onclick="toggleParams(this)">
        <span class="test-name">${t.name}</span>
        <span class="badge">READY</span>
      </div>
      <div class="test-params ${t.params?.length ? '' : 'open'}">
        ${paramFields}
        <button class="btn ${btnColor} run-btn" style="margin-left:auto;">${btnLabel}</button>
      </div>
      <pre class="test-result"></pre>
    `;

    const runBtn = card.querySelector(".btn.run-btn");
    const head = card.querySelector(".test-card-head");
    if (!t.params?.length) card.querySelector(".test-params").style.display = "flex";

    runBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!client) {
        logERR("Nicht verbunden! Zuerst oben auf 'Verbinden' klicken.");
        alert("Bitte zuerst mit openHAB verbinden!");
        return;
      }
      
      const params = {};
      card.querySelectorAll(".param-input").forEach(inp => {
        params[inp.dataset.key] = inp.value;
      });

      await runTest(head, () => t.fn(params), t.name, i + 1);
    });

    cardsList.appendChild(card);
  });

  if (s.isSSE) {
    logSSE("⚡ SSE-Tests öffnen den Livestream im Monitor (links unten). Stopp mit ■ Stop.");
  }
}