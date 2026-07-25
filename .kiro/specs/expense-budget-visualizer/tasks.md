# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a fully client-side, no-build-tooling expense tracker as three files (`index.html`, `app.css`, `app.js`). The JavaScript is organized as a single IIFE containing five internal modules (`storage`, `state`, `validator`, `ui`, `events`). All data flows unidirectionally: user action → state mutation → localStorage write → renderAll. Chart.js is loaded via CDN. The app must be responsive across 320–1920 px and handle all 8 error scenarios defined in the design.

---

## Tasks

- [x] 1. Create the HTML skeleton (`index.html`)
  - [x] 1.1 Write the full HTML file with the `<main class="app-grid">` layout containing all four sections: form-section, balance-section, chart-section, and list-section
    - Include the `<form id="transaction-form">` with fields: `#item-name` (text, maxlength=100), `#amount` (number, step=0.01, min=0.01), `#category` (select with Food/Transport/Fun options)
    - Add inline error `<span>` elements (`#err-name`, `#err-amount`, `#err-category`) with `aria-live="polite"`
    - Add `#balance-display`, `#chart-container` with `<canvas id="spending-chart">` and `<p id="chart-placeholder" hidden>`, and `<ul id="transaction-list" aria-label="Transaction history">`
    - Add `<div id="notification-banner" role="alert" aria-live="polite" hidden>` for non-blocking banners
    - Link `app.css` in `<head>` and add `<script src="app.js" defer>` before `</body>`
    - Add Chart.js CDN `<script>` tag before `app.js`
    - _Requirements: 1.1, 4.5, 6.1_

- [x] 2. Implement the CSS layout and responsive styles (`app.css`)
  - [x] 2.1 Write base styles, CSS custom properties (colors, spacing, font stack), and reset rules
    - Define color tokens for the three categories (Food, Transport, Fun) to match Chart.js dataset colors
    - Add `.error` style (red text, small font) and `.notification-banner` style (top-of-page, dismissible)
    - _Requirements: 6.1, 6.2_
  - [x] 2.2 Implement the three-breakpoint responsive grid layout
    - Mobile (320–767 px): single-column stack, `grid-template-columns: 1fr`
    - Tablet (768–1023 px): two-column grid, form and balance in column 1, chart and list in column 2
    - Desktop (1024–1920 px): wider two-column or three-column layout; no horizontal scrollbar at any breakpoint
    - `#transaction-list` independently scrollable (`overflow-y: auto`, fixed max-height) without shifting surrounding layout
    - _Requirements: 2.2, 6.2, 6.4_
  - [x] 2.3 Style individual components: form fields, error spans, balance display, chart container, transaction list items, and delete buttons
    - Transaction item: flex row with name (truncated via `text-overflow: ellipsis`), amount, category badge, and delete button
    - All interactive elements must remain accessible (focus styles, min tap target 44×44 px)
    - _Requirements: 2.1, 6.2_

- [x] 3. Implement the `storage` module inside `app.js` IIFE
  - [x] 3.1 Write the IIFE wrapper and the `storage` module with `load()` and `save()` functions
    - `const STORAGE_KEY = "expense_visualizer_v1"`
    - `storage.load()`: reads key, JSON.parses, returns array on success; returns `null` on JSON parse error or any thrown exception; wraps all calls in try/catch
    - `storage.save(transactions)`: JSON.stringifies, calls `localStorage.setItem`; returns `true` on success, `false` if setItem throws; wraps in try/catch; never throws
    - Feature-detect `localStorage` availability once on module load; store result in a module-level flag
    - _Requirements: 5.1, 5.2, 5.3, 5.6, 6.5_
  - [ ]* 3.2 Write property test for localStorage round-trip (Property 6)
    - **Property 6: localStorage round-trip preserves transaction data**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.6**
    - Use `fc.array(validTransactionArb)`: call `storage.save(arr)` then `storage.load()` and assert deep equality

- [x] 4. Implement the `validator` module
  - [x] 4.1 Write `validator.validateForm(name, amount, category)` returning `{ valid, errors }`
    - `name`: reject if empty after trim, reject if trimmed length > 100 chars
    - `amount`: reject if not parseable as a finite number, reject if < 0.01 or > 999999999.99
    - `category`: reject if not one of `["Food", "Transport", "Fun"]`
    - Return `{ valid: true, errors: {} }` only when all three fields pass; otherwise `{ valid: false, errors: { name?, amount?, category? } }`
    - _Requirements: 1.3, 1.4_
  - [ ]* 4.2 Write property test for whitespace name rejection (Property 2)
    - **Property 2: Whitespace-only or empty names are rejected**
    - **Validates: Requirements 1.3**
    - Generator: `fc.string().map(s => s.replace(/\S/g, ''))` — produces whitespace-only strings; assert `valid === false`
  - [ ]* 4.3 Write property test for out-of-range amounts (Property 3)
    - **Property 3: Out-of-range or non-numeric amounts are rejected**
    - **Validates: Requirements 1.4**
    - Generator: `fc.oneof(fc.constant(0), fc.float({max:-0.001}), fc.constant(1e10), fc.string())`; assert `valid === false`

- [x] 5. Implement the `state` module
  - [x] 5.1 Write `state` module with in-memory `transactions` array and all five methods: `load()`, `add()`, `remove()`, `balance()`, `totals()`
    - `state.load()`: calls `storage.load()`; if result is a valid array use it, else initialize to `[]`; calls `renderAll()` after load
    - `state.add(t)`: prepend transaction to array; call `storage.save()`; if save returns `false` show storage-error banner and do NOT update array or render; otherwise call `renderAll()`
    - `state.remove(id)`: filter out matching id; call `storage.save()`; if save returns `false` show deletion-error banner and restore original array; otherwise call `renderAll()`
    - `state.balance()`: sum all `transaction.amount` values; return 0 for empty list
    - `state.totals()`: return `{ Food: 0, Transport: 0, Fun: 0 }` with each value summed from matching transactions
    - _Requirements: 1.2, 1.6, 2.3, 2.4, 3.1, 3.2, 3.3, 5.2, 5.3, 5.4, 5.5_
  - [ ]* 5.2 Write property test for valid transaction grows list by 1 (Property 1)
    - **Property 1: Valid transaction is added to the list**
    - **Validates: Requirements 1.2, 2.1**
    - Generator: `fc.record({ name: fc.string({minLength:1,maxLength:100}).filter(s=>s.trim().length>0), amount: fc.float({min:0.01,max:999999999.99}), category: fc.constantFrom('Food','Transport','Fun') })`; assert list grows by 1 and new item is first
  - [ ]* 5.3 Write property test for balance equals sum (Property 4)
    - **Property 4: Balance equals sum of all transaction amounts**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Generator: `fc.array(validTransactionArb)`; assert `state.balance()` equals arithmetic sum of amounts
  - [ ]* 5.4 Write property test for delete preserves rest (Property 5)
    - **Property 5: Delete removes exactly one transaction and preserves the rest**
    - **Validates: Requirements 2.3**
    - Generator: `fc.array(validTransactionArb, {minLength:1})` + `fc.nat()` to pick index; assert list length decreases by 1 and all other transactions unchanged
  - [ ]* 5.5 Write property test for category totals consistent with list (Property 7)
    - **Property 7: Category totals are consistent with transaction list**
    - **Validates: Requirements 4.1, 4.2**
    - Generator: `fc.array(validTransactionArb)`; assert each category total equals sum of matching transactions and total of all categories equals `state.balance()`

- [x] 6. Checkpoint — core logic complete
  - Verify that `storage`, `validator`, and `state` modules all behave correctly with manual or scripted tests before wiring up the UI. Ask the user if questions arise.

- [x] 7. Implement the `ui` module render functions
  - [x] 7.1 Implement `ui.renderTransactionList(transactions)`
    - Clear the `<ul>` and re-build it from the transactions array (already in reverse-chronological order from `state`)
    - Each `<li>`: show item name (clamped/truncated at 100 chars via CSS `text-overflow`), amount formatted with `formatCurrency`, category badge, and a delete `<button data-id="...">` 
    - When `transactions` is empty, render an empty-state `<p>` message: "No expenses recorded yet."
    - _Requirements: 2.1, 2.2, 2.5_
  - [x] 7.2 Implement `ui.renderBalanceDisplay(balance)`
    - Write `formatCurrency(balance)` result to `#balance-display` inner text
    - Implement `formatCurrency` using `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`
    - _Requirements: 3.1, 3.2, 3.3_
  - [x] 7.3 Implement `ui.renderChart(totals, chartInstance)`
    - If `window.Chart` is undefined: hide `<canvas>`, show `#chart-placeholder` with "Chart unavailable", return `null`
    - When all category totals are 0: destroy existing chart instance if any, hide `<canvas>`, show `#chart-placeholder` with "No data available.", return `null`
    - Otherwise: create or update a Chart.js pie chart with dataset labels `["Food", "Transport", "Fun"]`, visually distinct colors per category, and display a legend
    - Return the chart instance so `events` can pass it back on subsequent renders
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [x] 7.4 Implement the `ui.showBanner(message)` and `ui.clearInlineErrors()` / `ui.showInlineErrors(errors)` helpers
    - `showBanner`: set text of `#notification-banner`, remove `hidden`, auto-dismiss after 5 s via `setTimeout`, add a close button; use `role="alert"` for screen reader accessibility
    - `showInlineErrors(errors)`: write error text to `#err-name`, `#err-amount`, `#err-category` based on keys present in the errors object
    - `clearInlineErrors()`: clear all three error spans
    - _Requirements: 1.3, 1.4, 2.4, 5.4, 5.5, 6.5_

- [x] 8. Implement the `events` module and wire the full data flow
  - [x] 8.1 Attach the `submit` listener on `#transaction-form`
    - Call `e.preventDefault()`; extract and trim field values; call `validator.validateForm()`
    - If invalid: call `ui.showInlineErrors(errors)`; return early
    - If valid: call `ui.clearInlineErrors()`; generate a UUID via `crypto.randomUUID()` with `Date.now()+Math.random()` fallback; build a `Transaction` object with `createdAt: new Date().toISOString()`; call `state.add(transaction)`
    - On success: reset form fields — name and amount to `""`, category select to `""` (default unselected option) — within 200 ms
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [x] 8.2 Attach event delegation listener on `#transaction-list` for delete buttons
    - Listen for `click` on `#transaction-list`; check `e.target.closest('[data-id]')`; call `state.remove(id)`
    - _Requirements: 2.3, 2.4_
  - [x] 8.3 Implement `renderAll()` as the single top-level render coordinator
    - `renderAll()` calls `ui.renderTransactionList(state.transactions)`, `ui.renderBalanceDisplay(state.balance())`, and `chartInstance = ui.renderChart(state.totals(), chartInstance)`
    - Ensure `renderAll` is defined before `state` and `ui` modules reference it (hoist or declare at IIFE top)
    - _Requirements: 1.2, 2.3, 3.2, 4.2, 5.2, 5.3_
  - [x] 8.4 Add initialization block at the bottom of the IIFE
    - Feature-detect `localStorage` before anything else; if unavailable call `ui.showBanner("LocalStorage is unavailable; data will not persist")` and proceed in-memory mode
    - Call `state.load()` to hydrate from localStorage and trigger first `renderAll()`
    - _Requirements: 5.1, 5.4, 6.5_
  - [ ]* 8.5 Write property test for form reset after successful add (Property 8)
    - **Property 8: Form reset clears all fields after successful add**
    - **Validates: Requirements 1.5**
    - Generator: `validTransactionArb`; simulate form submission; assert name field = `""`, amount field = `""`, category select value = `""`

- [x] 9. Implement all 8 error-handling scenarios
  - [x] 9.1 Validate that all error scenarios from the Error Surface Map are covered in the code
    - Missing field(s): inline error per field, no transaction added (covered by 4.1 + 8.1)
    - Invalid amount: inline error on amount field, no transaction added (covered by 4.1 + 8.1)
    - `localStorage` unavailable on load: non-blocking banner "Saved data could not be loaded", start with empty list (covered by 8.4)
    - `localStorage` write fails on add: non-blocking banner "Transaction could not be saved", no UI update (covered by 5.1)
    - `localStorage` write fails on delete: non-blocking banner "Deletion could not be completed", transaction stays (covered by 5.1)
    - `localStorage` parse error on load: non-blocking banner "Saved data could not be loaded", start with empty list (covered by 3.1)
    - Browser lacks `localStorage`: non-blocking banner about unavailability, in-memory mode (covered by 8.4)
    - Chart.js CDN failure: "Chart unavailable" message in chart area, balance and list still work (covered by 7.3)
    - Review all eight branches are reachable and the banner/error text matches the Error Surface Map exactly
    - _Requirements: 1.3, 1.4, 1.6, 2.4, 4.4, 5.4, 5.5, 6.5_

- [x] 10. Final checkpoint — end-to-end integration
  - Open `index.html` directly in a browser (no server required)
  - Verify add transaction → list updates, balance updates, chart updates, form resets
  - Verify delete transaction → list updates, balance updates, chart updates
  - Verify page reload → all transactions, balance, and chart are restored from localStorage
  - Verify responsive layout at 320 px, 768 px, 1024 px, and 1920 px — no horizontal scroll, no clipping
  - Ensure all tests pass; ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests (Properties 1–8) require fast-check loaded via CDN or in a test environment
- There is no build step — open `index.html` directly in a browser to run the app
- The IIFE in `app.js` must declare `renderAll` before the `state` and `ui` modules call it, or use a forward reference pattern
- The `chartInstance` variable lives in the IIFE closure scope and is updated by each call to `renderAll`
- All eight error scenarios must be individually reachable; simulate them via browser DevTools (block CDN, disable localStorage) for smoke testing

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "3.2", "4.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "5.1"] },
    { "id": 4, "tasks": ["5.2", "5.3", "5.4", "5.5", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 5, "tasks": ["8.1", "8.2", "8.3", "8.4"] },
    { "id": 6, "tasks": ["8.5", "9.1"] }
  ]
}
```
