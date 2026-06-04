# REQUIREMENT_GUIDELINES.md

## High-Level Vision

This document details the requirement guidelines for the AI assistant application designed for busy, work-dependent professionals. The core goal of the system is to minimize cognitive load, eliminate administrative overhead, and capture actionable data with zero friction.

---

## Core Product Requirements

### 1. Instant Capture Pipeline
Busy users need to offload tasks and thoughts instantly.
- **Input Channels**: Support quick-action voice recording and short text inputs.
- **Processing latency**: Transcribe and extract tasks in the background without blocking the user interface.
- **Task Extraction**: Automatically parse transcripts to identify action items, assignees, deadlines, and priorities.
- **Deterministic Parsing**: Parse dates, times, and simple command formats using standard code libraries rather than LLM calls. Use the LLM only to resolve complex semantic meaning.

### 2. Context-Aware Smart Scheduling
Static calendars and alerts fail when schedules shift.
- **Cognitive Load Optimization**: Group and rank tasks dynamically based on current user workload, meeting schedules, and history.
- **Focus Guarding**: Silence non-urgent alerts automatically during deep work sessions or active meetings.
- **Auto-Rescheduling**: If a reminder is missed or ignored, the system must recalculate the schedule and propose a new slot. Do not prompt the user for manual rescheduling.

### 3. Natural Language Memory Recall
Users need to access historical context instantly.
- **Semantic Search**: Allow search queries like "what did we decide about the db schema last week" or "find the email about the API key."
- **Source Attributions**: Every search answer must include links to the original text, document, or audio file source.

---

## Architectural & Design Constraints

### 1. Extreme Speed
- **Response Time**: Local user interface interactions must complete within 100 milliseconds.
- **Offline Capability**: Store active tasks locally to allow full offline operation. Sync changes to the server in the background when connectivity returns.

### 2. Services-First Design
- **Service Boundaries**: Build the capture system, the scheduling engine, and the search engine as separate, independent services under `services/`.
- **Contracts**: Communication between the UI and these engines must use defined interfaces under `contracts/`.

### 3. Absolute Privacy
- **Local Hashing**: Hash user identifiers.
- **PII Protection**: Do not store plaintext personal data in logs or temporary storage.

---

## Non-Negotiable Rules

1. **Local Evidentiary Testing**: Every scheduling update and task extraction pipeline must have automated unit tests running in less than 2 seconds.
2. **Quality Evals**: Maintain an evaluation suite for the transcription parser. Track extraction accuracy and parsing errors with each change.
3. **No Placeholders**: Do not write stub code or empty files. Every component must be fully implemented.
