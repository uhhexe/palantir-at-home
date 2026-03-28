# WAR ROOM — DEVELOPMENT ROADMAP
## Generated: 2026-03-28
## Based on: Full Project Audit

---

## Immediate Fixes (things that are broken or at risk)

1. **Commit all work to git** — All code since initial scaffold is uncommitted. Run `git add` + `git commit` immediately.
2. **Bridges layer toggle does nothing** — Layer exists in sidebar but has no API endpoint or data source. Either wire up a HIFLD bridges endpoint or remove from sidebar.
3. **Wildfire layer returning 0 features** — Verify the NIFC ArcGIS endpoint is still active or find alternate source.
4. **HIFLD 2,000 record cap** — All ArcGIS queries are capped at `resultRecordCount=2000`. Hospitals (7K+), fire stations (27K+), cell towers (200K+) are severely underrepresented.

---

## Phase 1: Northeast Camera Coverage (NJ, NY, PA, CT, DE)

**Goal:** Live camera feeds for the primary use area (NJ/NY metro, I-95 corridor)

| Task | Approach | Complexity |
|------|----------|-----------|
| NJ cameras — 511NJ scrape | Firecrawl MCP to scrape 511nj.org camera pages | MEDIUM |
| NJ cameras — NJTA fallback | Scrape njta.gov/travel-resources/camera-list/ for Turnpike/GSP cams | MEDIUM |
| NY cameras — 511NY API | Register for free dev key at 511ny.org/developers, integrate JSON API | EASY |
| TRANSCOM tri-state | Use 511NY API key — covers NJ/NY/CT Port Authority feeds | EASY |
| DelDOT cameras | Integrate DelDOT camera API (known to have clean REST API) | EASY |
| ConnDOT cameras | Research 511CT API or scrape ctroads.org | MEDIUM |
| MassDOT cameras | Research MassDOT camera feeds | MEDIUM |
| NYC DOT city cameras | Integrate NYC DOT camera feeds (non-highway city cameras) | MEDIUM |

**Estimated total new cameras:** 3,000-5,000 across NJ/NY/CT/DE/MA

---

## Phase 2: ALPR/Flock Layer + OSM Surveillance Layer

**Goal:** Comprehensive surveillance awareness — know where every camera is

| Task | Approach | Complexity |
|------|----------|-----------|
| OSM cameras US-wide pre-cache | Run US-wide Overpass query, cache 219K+ results in Supabase | MEDIUM |
| Viewport-based OSM loading | Load OSM cameras based on current map viewport to avoid overwhelming browser | MEDIUM |
| DeFlock.org integration | Scrape or API — Flock camera locations across US | MEDIUM |
| ALPRmaps.com integration | Check for API/data export of crowdsourced ALPR locations | MEDIUM |
| EyesOnFlock.com integration | Flock transparency portal aggregator — scrape camera data by city/agency | MEDIUM |
| Atlas of Surveillance (EFF) | Integrate EFF's police surveillance tech database (ALPRs, drones, ShotSpotter) | MEDIUM |
| Camera type differentiation | Different marker styles: live DOT (green pulsing), OSM location (gray), ALPR (blue diamond), Flock (orange) | EASY |
| Camera search/filter panel | Search cameras by name, road, county, state, type | MEDIUM |

---

## Phase 3: All HIFLD Infrastructure Layers

**Goal:** Complete national infrastructure coverage

| Task | Approach | Complexity |
|------|----------|-----------|
| Implement ArcGIS pagination | Fetch all records using `resultOffset` + `resultRecordCount` in batches | MEDIUM |
| Add military bases layer | HIFLD military installations dataset | EASY |
| Add railroad lines layer | HIFLD railroad network dataset (line geometry) | EASY |
| Add airports layer | HIFLD airports dataset | EASY |
| Add bridges layer | Wire up HIFLD National Bridge Inventory | EASY |
| Add water treatment plants | HIFLD water treatment facilities | EASY |
| Add wastewater plants | HIFLD wastewater treatment facilities | EASY |
| Layer data caching | Store fetched GeoJSON in Supabase for fast reload | MEDIUM |
| Landing points for cables | Already have API endpoint, wire to sidebar toggle | EASY |

---

## Phase 4: Real-Time Hazard Layers (weather, earthquakes, floods)

**Goal:** Live situational awareness for natural hazards

| Task | Approach | Complexity |
|------|----------|-----------|
| FEMA flood zones | Overlay from FEMA NFHL MapServer (tile layer, not GeoJSON) | MEDIUM |
| USGS stream gauges | JSON API — real-time water levels by state | EASY |
| OpenAQ air quality | REST API — monitoring station data, no auth | EASY |
| NOAA radar overlay | Weather radar tile layer from NOAA | MEDIUM |
| FAA TFR (no-fly zones) | Scrape tfr.faa.gov for active temporary flight restrictions | MEDIUM |
| EPA toxic release sites | TRI facility locations from enviro.epa.gov | EASY |
| Auto-refresh hazard data | Background polling for earthquakes (5 min), weather (5 min), wildfires (1 hr) | EASY |
| Alert notifications | Toast/badge when new severe weather alert or significant earthquake | MEDIUM |

---

## Phase 5: UI Polish Pass

**Goal:** Production-quality interface

| Task | Approach | Complexity |
|------|----------|-----------|
| Camera search panel | Searchable/filterable list of all cameras with quick-jump | MEDIUM |
| Layer search/filter | Search layers by name in sidebar | EASY |
| Keyboard shortcuts | Map navigation, layer toggles, panel switching | EASY |
| Loading skeletons | Skeleton UI while camera images and layer data load | EASY |
| Map legend | Dynamic legend showing active layers with color coding | MEDIUM |
| Fullscreen camera view | Expand camera feed to full panel width | EASY |
| Multi-camera view | Grid view of 4-6 cameras simultaneously | MEDIUM |
| Mobile responsive | Collapsible sidebar, touch-friendly controls, bottom sheet for mobile | HARD |
| Print/export map view | Screenshot or PDF export of current map state | MEDIUM |
| Dark/light theme toggle | Light theme option (some users may want it) | EASY |

---

## Phase 6: RAG Chat Integration

**Goal:** AI-powered document search and analysis

| Task | Approach | Complexity |
|------|----------|-----------|
| Connect Supabase with real creds | Create project, run migration, set env vars | EASY |
| Document upload API | `/api/ingest` — accept PDF, DOCX, TXT files | MEDIUM |
| Text chunking pipeline | Split documents into overlapping chunks (512 tokens, 50 overlap) | MEDIUM |
| Embedding generation | OpenAI `text-embedding-3-small` for chunk embeddings | EASY |
| Vector similarity search | pgvector `<=>` cosine distance search over chunk embeddings | EASY |
| RAG query endpoint | `/api/chat` — retrieve relevant chunks, pass to Claude with context | MEDIUM |
| Streaming responses | Claude streaming API with SSE to chat panel | MEDIUM |
| Source citations | Display source documents/pages in chat responses | EASY |
| Dataset management UI | INGEST panel — upload files, create datasets, view status | MEDIUM |
| Conversation history | Save/load chat conversations from Supabase | EASY |

---

## Phase 7: Canvas/Graph View

**Goal:** Visual research board for connecting dots

| Task | Approach | Complexity |
|------|----------|-----------|
| ReactFlow canvas setup | Basic infinite canvas with node creation | MEDIUM |
| Node types | Text notes, images, links, map locations, documents, cameras | HARD |
| Edge connections | Connect nodes with labeled edges (relationships) | MEDIUM |
| Map-to-canvas linking | Pin a map location/camera to canvas as a node | MEDIUM |
| Document-to-canvas | Drag document excerpts from chat to canvas | MEDIUM |
| Obsidian vault import | Parse .md files with `[[wikilinks]]` into graph nodes + edges | HARD |
| Graph layout algorithms | Auto-arrange nodes (force-directed, hierarchical) | MEDIUM |
| Canvas persistence | Save/load canvas state to Supabase | MEDIUM |
| Export canvas | Export as image, PDF, or JSON | EASY |

---

## Phase 8: Desktop Wrapper (Tauri)

**Goal:** Native desktop application

| Task | Approach | Complexity |
|------|----------|-----------|
| Tauri setup | Initialize Tauri with Next.js static export | HARD |
| System tray | Background process with tray icon, notifications | MEDIUM |
| File system access | Direct file reading for document ingest (no upload needed) | MEDIUM |
| Auto-update | GitHub releases + Tauri updater | MEDIUM |
| Local database option | SQLite + sqlite-vss as alternative to Supabase for offline use | HARD |
| Keyboard global shortcuts | System-wide hotkey to open/focus War Room | EASY |
| Multi-window | Detach camera feeds or canvas to separate windows | HARD |

---

## Timeline Estimate

| Phase | Status | Priority |
|-------|--------|----------|
| Immediate fixes | NOT STARTED | NOW |
| Phase 1: NE cameras | NOT STARTED | WEEK 1-2 |
| Phase 2: ALPR/Flock | PARTIAL (OSM done) | WEEK 2-3 |
| Phase 3: HIFLD expansion | PARTIAL (10 layers done) | WEEK 3-4 |
| Phase 4: Hazard layers | PARTIAL (3 of 6 done) | WEEK 4-5 |
| Phase 5: UI polish | NOT STARTED | WEEK 5-6 |
| Phase 6: RAG chat | NOT STARTED | WEEK 6-8 |
| Phase 7: Canvas | NOT STARTED | WEEK 8-10 |
| Phase 8: Tauri | NOT STARTED | WEEK 10-12 |
