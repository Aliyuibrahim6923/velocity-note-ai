## Velocity Note AI: Product Requirements Document (v1.1)

### 1. Document Control

**Product Name:** Velocity Note AI (Code Name: Blitz)
**Target Release:** Q4 2026
**Platform:** Web / React (PWA) (Adapted from Android 15/16)
**Document Version:** v1.1 (Updated to include manual text input and financial tracking)

---

### 2. Executive Summary & Core Vision

**The Problem:** High-net-worth individuals and ultra-busy professionals talk and think faster than they can type or navigate mobile UI hierarchies. Traditional note apps require explicit manual categorization, tagging, and folder routing, which causes friction and lost data.

**Product Vision:** A zero-UI-friction canvas that turns unstructured speech and quick text jots into instant action items, calendar entries, financial logs, and brief summaries entirely in the background. The user inputs raw thought; the application handles structure.

**Success Metrics (KPIs):**

* **Time-to-Capture:** Under 2 seconds from tapping the application icon to active data streaming (voice or text).
* **Triage Automation:** Greater than 90% of unstructured inputs correctly sorted without human intervention.
* **Single-Handed Usability:** 100% of core creation paths executable using only one thumb.
* **Offline Capability:** 100% of critical parsing and entity extraction must function without an active internet connection.

---

### 3. Core Functional Modules (MVP Scope)

#### 3.1 The Infinite Input Stream

The landing view is entirely focused on input. There are no folders to navigate.

* **Voice Priority:** A prominent floating microphone button at the bottom center. Tapping initializes low-latency, real-time background recording via Web Speech API.
* **Silent Text Input:** A secondary keyboard icon immediately beside the microphone allows for rapid typing in meetings or quiet spaces. The text payload is processed with the exact same priority as voice.
* **Share Sheet Target:** Accepts text payloads highlighted and shared from external applications.

#### 3.2 The Single-Action Feed (Dashboard)

A unified chronological timeline showing extracted insights. Items are not plain text; they are rendered as interactive, categorized cards.

* **Task Cards:** Highlighted with high-contrast borders (e.g., amber for urgent). Includes a single-tap swipe-to-complete action.
* **Event Cards:** Displays extracted dates and times with an accent color, offering a one-tap sync to the native Calendar.
* **Financial Cards:** Renders financial extractions (amounts, payees, context) with a distinct green motif and a one-tap export-to-CSV function.
* **Intel Cards:** Clean, monochrome cards for raw notes, featuring a quick-copy utility.

#### 3.3 AI Autonomous Triage Engine (The Background Hand)

A local parsing layer that identifies intent, timelines, financial entities, and urgency from raw text or transcribed speech. The engine categorizes every input into one of four rigid buckets:

1. **ACTION_ITEM:** Executable tasks (e.g., "Email Sarah the pitch deck by 4 PM").
2. **CALENDAR_EVENT:** Fixed schedule blocks (e.g., "Dinner with John tomorrow at 7 PM").
3. **FINANCIAL_LOG:** Transactional data (e.g., "i paid aliyu 500k for saiha plaza rent").
4. **STATIC_INTEL:** Passive insights or logs (e.g., "Hotel room number is 1402").

---

### 4. Technical Architecture (React Web App Adaptation)

Relying entirely on cloud-based Large Language Models (LLMs) introduces unacceptable latency and privacy concerns for this demographic. The MVP relies on edge computing.

* **Language & UI:** React (via Vite) and vanilla CSS for declarative, asynchronous rendering.
* **Speech-to-Text Pipeline:** Native Web Speech API, highly optimized for local/offline transcription.
* **On-Device AI Inference:**
* **Primary Engine:** Google's **AICore (window.ai)** running **Gemini Nano** locally in the browser. This provides shared, centralized OS-level inference with zero network latency.
* **Fallback Engine:** A robust deterministic Regex/Heuristic parser bundled in the application code.
* **Database:** IndexedDB (via localforage or native wrapper) for structured, high-speed querying of the timeline offline.

---

### 5. On-Device Triage Processing Pipeline

The system must handle asynchronous data flows without blocking the main UI thread.

1. **Ingestion & Normalization:**
Raw audio is piped through the STT engine, or raw text is accepted from the keyboard. The output is converted to a normalized string.

2. **Prompt Assembly:**
The normalized text is wrapped in a highly specific prompt.

3. **Local Inference Execution:**
The prompt is passed to the local engine.

4. **JSON Parsing & Mapping:**
The resulting JSON output is parsed by the application logic into the `VelocityItem` data structure.

5. **Database Commit & UI Refresh:**
The newly populated object is inserted into IndexedDB, and React instantly prepends the new interactive card to the top of the user's dashboard.

---

### 6. Database Schema Definition (IndexedDB Representation)

| Column Name | Data Type | Constraints | Description |
| --- | --- | --- | --- |
| `id` | String | Primary Key | UUID for secure, unique identification. |
| `raw_text` | String | Not Null | The exact output from the STT or keyboard stream. |
| `category` | Enum | Not Null | `ACTION_ITEM`, `CALENDAR_EVENT`, `FINANCIAL_LOG`, `STATIC_INTEL`. |
| `priority` | Enum | Default: `LOW` | `LOW`, `NORMAL`, `HIGH`, `CRITICAL`. |
| `event_timestamp` | Long | Nullable | Epoch time for calendar events or task deadlines. |
| `metadata_json` | String | Nullable | Stores entity-specific extractions. |
| `created_at` | Long | Not Null | Epoch time of creation for chronological sorting. |

---

### 7. Security & Data Privacy Constraints

The target demographic demands absolute data sovereignty.

* **Zero Cloud Leakage:** No raw audio, text inputs, or extracted metadata will ever be sent to external servers for processing. The application will not require or request internet calls for its core logic.
* **Automated Data Purge:** A background process will automatically delete `STATIC_INTEL` items older than 30 days. User toggleable.
