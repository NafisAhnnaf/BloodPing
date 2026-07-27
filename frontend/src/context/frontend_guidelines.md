# BloodPing Frontend Guidelines

This document outlines the architectural patterns, styling conventions, and core state workflows that govern the BloodPing frontend. Adhering to these rules ensures the app remains scalable, maintainable, and aligned with our design system.

## 1. Architecture & OOD

All React components must be modular and adhere to SOLID principles.

- **SRP (Single Responsibility Principle):** Components should do one thing. For instance, a `RequestCard` purely renders the visual state of a blood request. It accepts props and callbacks (like `onDonate`) rather than managing complex data-fetching internally.
- **OCP (Open/Closed Principle):** Base UI components (like `RangeSlider`, `SegmentedControl`, or `SelectDropdown`) are designed to be open for extension (via props) but closed for modification. They do not contain app-specific logic, meaning they can be reused anywhere in the app without altering their internal code.
- **State Management:** We use React Context (`AppDataContext` and `RoleContext`) to manage global state simulating a robust backend. Components consume this state cleanly via hooks (`useAppData()`).

## 2. Code Quality

- **Self-Documenting Code:** Write clean code with explicit TypeScript interfaces for all props and state shapes.
- **Optional Chaining:** Always use optional chaining (`?.`) and safe fallbacks (e.g., `|| []`) when mapping over or rendering dynamic data. This ensures the UI safely gracefully handles undefined or transitioning states without crashing.

## 3. Design System & Conventions

Our aesthetic is defined as **"Pragmatic Urgency"**. It combines critical alert styling with modern, premium glassmorphism.

- **Colors:** We do not use plain red. The primary brand gradient spans from `amber-400` via `red-500` to `rose-600`. Neutral text should be `slate-900` or `slate-500` (never pure black or gray).
- **Glassmorphism Base:** Most cards and modals use a glassmorphism effect: `bg-white/40 backdrop-blur-xl border border-white/50 shadow-lg`.
- **Typography:** We use modern sans-serif fonts. Important numbers and actions should be `font-black` or `font-extrabold` with tight tracking (`tracking-tight`). Labels and metadata use `text-xs font-bold uppercase tracking-wider`.
- **Visual Separation:** Elements must have clear visual hierarchy. Use subtle horizontal dividers (`bg-orange-100/60`) and distinct active states (like sliding white backgrounds in segmented controls).

## 4. Core State Workflows

To simulate a complete end-to-end application, we maintain an in-memory state within `AppDataContext`.

### The Donor Workflow
1. **Discovery:** The donor logs in and views the `HomeFeed`. They can filter requests by Blood Group, Distance, and Urgency.
2. **Action (Donate/Pending):** The donor clicks "Donate" on a `RequestCard`. 
3. **Resolution:** 
   - The system triggers `donateToRequest(reqId)`.
   - The request's `unitsFulfilled` increments. 
   - If `unitsFulfilled >= unitsRequired`, the status shifts from `open` to `completed`. Otherwise, it remains `pending` or `open`.
   - The action updates the current donor's score on the `Leaderboard`, visually reflecting their impact immediately.

### The Recipient Workflow
1. **Creation:** The recipient creates a new blood request (via `createRequest`). The context generates a new ID, sets the initial date, and assigns an `open` status.
2. **Management:** The recipient views their active and past requests in the `PostRequestFlow` (History) page. They can see how many units have been fulfilled and how many donors have applied.
3. **Fulfillment:** 
   - The recipient can manually click "Mark Completed" on a card.
   - This triggers `updateRequestStatus(reqId, 'completed')`, locking the card from further donations and updating its visual state to emerald green.
