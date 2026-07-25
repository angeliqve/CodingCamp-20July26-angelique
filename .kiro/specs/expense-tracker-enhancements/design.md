# Design Document — Expense Tracker Enhancements

## Overview

This document describes the technical design for five enhancements added to the Expense & Budget Visualizer: Custom Categories, Monthly Summary View, Transaction Sorting, Budget Thresholds & Spending Alerts, and Dark/Light Mode Toggle.

The application is a constraint-first project: no build tooling, no npm, no new files — all changes land in the three existing files (`index.html`, `app.js`, `app.css`). Every new capability integrates into the existing IIFE module architecture without breaking the current data model.

### Key design principles

- **Additive, not rewriting.** Each module gains new functions; existing functions are extended at well-defined call sites only.
- **Single render coordinator.** The existing `renderAll()` function remains the sole top-level render entry point. New features hook in as additional render steps at the end of that function.
- **Ephemeral UI state lives in the IIFE closure.** Sort order, active month filter, and theme state are held as module-level variables — never serialised except where requirements explicitly demand persistence.
- **New localStorage keys are isolated.** Three new keys (`expense_categories_v1`, `expense_thresholds_v1`, `expense_theme_v1`) follow the same load/save pattern already used by `expense_visualizer_v1`.

---

## Architecture

### Module responsibility map (after enhancements)

```
IIFE closure
├── STORAGE_KEY           (unchanged)
├── CATEGORIES_KEY        (new)
├── THRESHOLDS_KEY        (new)
├── THEME_KEY             (new)
├── CATEGORY_PALETTE      (new — 8-color rotating array)
│
├── storage               (extended)
│   ├── load()            (unchanged)
│   ├── save()            (unchanged)
│   ├── loadCategories()  (new)
│   ├── saveCategories()  (new)
│   ├── loadThresholds()  (new)
│   ├── saveThresholds()  (new)
│   ├── loadTheme()       (new)
│   └── saveTheme()       (new)
│
├── validator             (extended)
│   ├── validateForm()    (updated — accepts dynamic category list)
│   └── validateCategory()(new)
│   └── validateThreshold()(new)
│
├── state                 (extended)
│   ├── transactions      (unchanged)
│   ├── categories        (new — custom categories array)
│   ├── thresholds        (new — thresholds object)
│   ├── sortKey           (new — ephemeral sort state)
│   ├── activeMonth       (new — ephemeral month filter, null = "All")
│   ├── load()            (updated — also loads categories, thresholds, theme)
│   ├── add()             (updated — respects sort + filter for re-render)
│   ├── remove()          (unchanged logic, re-render picks up sort + filter)
│   ├── balance()         (updated — accepts optional transaction array)
│   ├── totals()          (updated — accepts optional transaction array, dynamic categories)
│   ├── addCategory()     (new)
│   ├── deleteCategory()  (new)
│   ├── setThreshold()    (new)
│   ├── setSortKey()      (new)
│   └── setActiveMonth()  (new)
│
├── ui                    (extended)
│   ├── renderTransactionList() (updated — accepts pre-sorted/filtered array)
│   ├── renderBalanceDisplay()  (updated — threshold indicator support)
│   ├── renderChart()           (updated — dynamic labels/colors, threshold indicators)
│   ├── renderCategoryManager() (new)
│   ├── renderMonthSelector()   (new)
│   ├── renderSortControl()     (new)
│   ├── renderThresholdPanel()  (new)
│   ├── applyTheme()            (new)
│   ├── showBanner()            (unchanged)
│   ├── clearInlineErrors()     (unchanged)
│   └── showInlineErrors()      (unchanged)
│
├── events                (extended)
│   ├── init()            (updated — wires new controls)
│   └── [new handlers]    (category, sort, month, threshold, theme)
│
├── renderAll()           (updated — orchestrates all new render steps)
│
└── initApp()             (updated — loads theme first, then hydrates)
```

### Data flow

```
User action
    │
    ▼
events.[handler]()
    │
    ├─► state.[mutation]()  ──► storage.[save]()
    │
    └─► renderAll()
            ├── derive filteredAndSorted(state.transactions)
            ├── ui.renderTransactionList(filteredAndSorted)
            ├── ui.renderBalanceDisplay(state.balance(filteredAndSorted))
            ├── chartInstance = ui.renderChart(state.totals(filteredAndSorted), chartInstance)
            ├── ui.renderCategoryManager(state.categories)
            ├── ui.renderMonthSelector(state.transactions, state.activeMonth)
            ├── ui.renderThresholdPanel(state.categories, state.thresholds,
            │                           state.totals(all transactions))
            └── (theme is applied eagerly on toggle, not via renderAll)
```

---

## Components and Interfaces

### 1. Category Manager

**HTML additions (inside `.form-section` card, below the form):**

```html
<section id="category-manager" class="card category-manager-section">
  <h2>Manage Categories</h2>
  <div class="field">
    <label for="new-category-name">New Category Name</label>
    <input id="new-category-name" type="text" maxlength="30"
           placeholder="e.g. Groceries" />
    <span class="error" id="err-category-name" aria-live="polite"></span>
  </div>
  <button type="button" id="add-category-btn">Add Category</button>
  <ul id="category-list" aria-label="Custom categories"></ul>
</section>
```

`ui.renderCategoryManager(categories)` rebuilds `#category-list`. Each built-in category is rendered as a read-only `<li>` with no delete button. Each custom category gets a delete button with `data-category` attribute for event delegation.

### 2. Month Selector

**HTML additions (inside `.list-section` card, above the transaction list):**

```html
<div class="month-filter-row">
  <label for="month-selector">Filter by Month</label>
  <select id="month-selector">
    <option value="all">All</option>
    <!-- populated dynamically -->
  </select>
  <span id="month-total" class="month-total"></span>
</div>
```

`ui.renderMonthSelector(transactions, activeMonth)` derives the sorted list of distinct `YYYY-MM` strings from `transactions`, rebuilds the `<select>` options, re-selects `activeMonth`, and updates `#month-total` with the month's spending sum.

### 3. Sort Control

**HTML additions (inside `.list-section` card, between the month selector and the transaction list):**

```html
<div class="sort-row">
  <label for="sort-control">Sort by</label>
  <select id="sort-control">
    <option value="date-desc">Date (newest first)</option>
    <option value="date-asc">Date (oldest first)</option>
    <option value="amount-desc">Amount (high to low)</option>
    <option value="amount-asc">Amount (low to high)</option>
    <option value="category-asc">Category (A–Z)</option>
    <option value="category-desc">Category (Z–A)</option>
  </select>
</div>
```

The sort is applied in-memory by `state.getSortedFiltered()` (a pure derivation helper, not a mutation) called at the top of `renderAll()`.

### 4. Budget Threshold Panel

**HTML additions (new card, inside `.app-grid`):**

```html
<section id="threshold-panel" class="card threshold-section">
  <h2>Budget Thresholds</h2>
  <p class="threshold-hint">Set a limit of 0 to disable.</p>
  <div id="threshold-list">
    <!-- one row per category + total row, rendered dynamically -->
  </div>
</section>
```

Each threshold row contains:
- A `<label>` with the category name
- An `<input type="number" min="0" step="0.01" max="999999999.99">` with `data-threshold-key`
- A `<span class="error">` for inline validation
- A `<span class="threshold-indicator">` showing ⚠ when triggered
- A `<button>` to save the threshold value

`ui.renderThresholdPanel(categories, thresholds, currentTotals)` rebuilds the panel and applies `.threshold-exceeded` class where spending ≥ threshold.

### 5. Theme Toggle

**HTML additions (top-level, just after `<body>` open tag, before `#notification-banner`):**

```html
<button id="theme-toggle" type="button"
        aria-pressed="false"
        aria-label="Switch to dark mode"
        class="theme-toggle">
  <span aria-hidden="true" class="theme-icon">🌙</span>
</button>
```

`ui.applyTheme(theme)` sets `document.documentElement.setAttribute('data-theme', theme)` and updates the button's `aria-pressed` and `aria-label` and icon. This is called eagerly (outside `renderAll`) on toggle and during `initApp()`.

---

## Data Models

### Category object

```js
// Stored in expense_categories_v1 as a JSON array of CategoryEntry objects
{
  name: string,        // 1–30 chars, printable non-whitespace, unique case-insensitively
  colorIndex: number   // 0–7, index into CATEGORY_PALETTE
}
```

Built-in categories (Food, Transport, Fun) are **not stored** in `expense_categories_v1`. They are defined in code. The stored array contains only user-created categories.

The combined list used throughout the app is:

```js
const BUILTIN_CATEGORIES = ['Food', 'Transport', 'Fun'];
// Full list = BUILTIN_CATEGORIES.concat(state.categories.map(c => c.name))
```

### Category color palette

```js
const CATEGORY_PALETTE = [
  '#9b59b6', // purple
  '#e74c3c', // red
  '#1abc9c', // teal
  '#e67e22', // orange
  '#3498db', // light blue
  '#e91e63', // pink
  '#00bcd4', // cyan
  '#8bc34a', // lime
];
```

New custom categories receive `colorIndex = state.categories.length % 8` at the time of creation. This produces a deterministic, rotating assignment without requiring the user to pick a color.

### Transaction object (unchanged)

```js
{
  id: string,         // crypto.randomUUID() or fallback
  name: string,       // 1–100 chars
  amount: number,     // ≥ 0.01
  category: string,   // must be in combined category list at time of submission
  createdAt: string   // ISO 8601
}
```

### Thresholds object

```js
// Stored in expense_thresholds_v1 as a plain JSON object
{
  [categoryName: string]: number,  // 0 = disabled, positive = limit
  __total__: number                // reserved key for total spending threshold
}
```

`__total__` is used as the key for the total-spending threshold to avoid collisions with user category names (which cannot contain `_` at start because they must be printable non-whitespace only — but this is a defensive choice).

### Theme value

```js
// Stored in expense_theme_v1 as a plain string: "light" | "dark"
```

### Ephemeral state (in-memory only, never persisted)

```js
let sortKey = 'date-desc';    // default sort
let activeMonth = null;       // null = "All"
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Valid category name addition round-trip

*For any* valid category name (non-empty, ≤30 characters, printable non-whitespace, not a duplicate), submitting it through the Category_Manager must result in: (a) the name appearing in the Category_Dropdown, and (b) the category list in localStorage containing that name.

**Validates: Requirements 1.2, 1.8**

---

### Property 2: Invalid category names are always rejected

*For any* category name that is empty, composed entirely of whitespace, or longer than 30 characters, the validator must reject it — the category list must remain unchanged and no write to localStorage must occur.

**Validates: Requirements 1.3**

---

### Property 3: Duplicate category names are always rejected (case-insensitive)

*For any* existing category name and any case-permutation of that name, attempting to add the permutation must be rejected — the category list must remain unchanged.

**Validates: Requirements 1.4**

---

### Property 4: Category count invariant

*For any* sequence of add/delete operations on custom categories, the total number of entries in the Category_Dropdown (built-ins + custom) must never exceed 50.

**Validates: Requirements 1.5**

---

### Property 5: Custom category deletion preserves transactions

*For any* custom category that has associated transactions, deleting the category must remove it from the dropdown and localStorage while leaving every transaction whose `category` field equals that name intact in `expense_visualizer_v1`.

**Validates: Requirements 1.6**

---

### Property 6: Month selector options equal distinct transaction months

*For any* set of transactions, the options in the Month_Selector must equal exactly the set of distinct calendar months (YYYY-MM) derived from `createdAt` fields, plus one "All" option — no more, no fewer.

**Validates: Requirements 2.1**

---

### Property 7: Month filter correctness

*For any* transaction list and any selected month M, the Transaction_List must display exactly those transactions whose `createdAt` falls within month M, and the Balance_Display total must equal the sum of those transactions' amounts.

**Validates: Requirements 2.2, 2.6**

---

### Property 8: "All" filter shows every transaction

*For any* transaction list, selecting "All" in the Month_Selector must result in the Transaction_List displaying every transaction and the Balance_Display showing the full sum.

**Validates: Requirements 2.3**

---

### Property 9: New transaction respects active month filter

*For any* new transaction added while a month M filter is active, the transaction must appear in the Transaction_List if and only if its `createdAt` month equals M.

**Validates: Requirements 2.4**

---

### Property 10: Sort does not mutate stored data

*For any* transaction list and any sort option, applying the sort must produce a correctly ordered view without modifying the transactions stored in localStorage.

**Validates: Requirements 3.2**

---

### Property 11: Sort order is maintained after add and delete

*For any* active sort key, adding or deleting a transaction must leave the Transaction_List in the same sorted order as before the mutation (with the new/removed transaction appropriately included/excluded).

**Validates: Requirements 3.3, 3.4**

---

### Property 12: Amount sort correctness with tiebreaker

*For any* transaction list sorted by amount (ascending or descending), transactions must appear in non-decreasing (or non-increasing) order of `amount`; ties must be broken by `createdAt` descending.

**Validates: Requirements 3.5, 3.6**

---

### Property 13: Category sort is case-insensitive with tiebreaker

*For any* transaction list sorted by category (A–Z or Z–A), the order must be determined by case-insensitive comparison of `category` strings; transactions in the same category must be sorted by `createdAt` descending.

**Validates: Requirements 3.7, 3.8**

---

### Property 14: Sort and month filter compose correctly

*For any* active month filter and any active sort key applied simultaneously, the displayed list must be exactly the intersection of the filtered set and the sorted order — as if filter were applied first, then sort.

**Validates: Requirements 3.9**

---

### Property 15: Threshold persistence round-trip

*For any* valid threshold value (0 ≤ v ≤ 999,999,999.99) saved for any category or total, reading back from localStorage must return the same value.

**Validates: Requirements 4.2**

---

### Property 16: Threshold indicator activates when spending ≥ threshold

*For any* non-zero threshold T set for a category (or total) and any transaction set where the relevant spending total S satisfies S ≥ T, the Threshold_Indicator for that category (or total balance) must be in the active (exceeded) state.

**Validates: Requirements 4.3, 4.4**

---

### Property 17: Threshold indicator deactivates when spending < threshold

*For any* threshold T and transaction set where the relevant spending total S satisfies S < T (or T = 0), the Threshold_Indicator for that slot must be in the inactive (normal) state.

**Validates: Requirements 4.5**

---

### Property 18: Invalid threshold values are always rejected

*For any* non-numeric, negative, or out-of-range threshold input, the validator must reject it and no write to localStorage must occur.

**Validates: Requirements 4.8**

---

### Property 19: Threshold indicator recalculates after threshold update

*For any* existing threshold updated to a new valid value, all Threshold_Indicator states must be re-evaluated against current spending totals using the new threshold value.

**Validates: Requirements 4.10**

---

### Property 20: Theme toggle switches and persists correctly

*For any* current theme state ("light" or "dark"), activating the Theme_Toggle must switch `data-theme` on `<html>` to the opposite value and persist that new value to localStorage under `expense_theme_v1`.

**Validates: Requirements 5.2, 5.3**

---

### Property 21: Theme is restored on initialisation

*For any* theme value persisted in localStorage, initialising the app must apply that theme to `document.documentElement` before the first render call.

**Validates: Requirements 5.4**

---

### Property 22: Theme toggle aria-pressed reflects active theme

*For any* theme state, the Theme_Toggle's `aria-pressed` attribute must equal `"true"` when dark mode is active and `"false"` when light mode is active.

**Validates: Requirements 5.9**

---

## Error Handling

### localStorage unavailability

`storage.available` is detected once on module load (existing behaviour). All new `load*()` / `save*()` helpers follow the same pattern: return a sensible default on failure, return `false` on save failure.

| Scenario | Behaviour |
|---|---|
| `loadCategories()` fails | Returns `[]`; built-ins still shown |
| `saveCategories()` fails | `ui.showBanner()` called; dropdown unchanged |
| `loadThresholds()` fails | Returns `{}`; no indicators shown |
| `saveThresholds()` fails | `ui.showBanner()` called; indicator state unchanged |
| `loadTheme()` fails | Falls through to OS preference then light default |
| `saveTheme()` fails | Theme applied visually but not persisted (silent — not critical) |

### Validation errors

All validation is synchronous and inline. The `validator` module gains two new pure functions:

```js
// Returns { valid: boolean, error: string|null }
validator.validateCategory(name, existingCategories)
validator.validateThreshold(value)
```

Inline errors are displayed via the existing `ui.showInlineErrors()` pattern, with element IDs `err-category-name` and `err-threshold-{key}`.

### Month selector parse errors

If `createdAt` on any transaction fails `Date.parse()`, that transaction is silently excluded from month derivation. If the entire population fails, the Month_Selector defaults to "All" and the unfiltered list is shown (Requirement 2.9).

### Category deleted while active in filter

If `activeMonth` references a month that no longer has any transactions (after deletion), the Month_Selector automatically reverts to "All" at the next `renderMonthSelector()` call because the deleted month will no longer appear in the options.

---

## Testing Strategy

### Dual testing approach

Unit tests cover specific examples and edge cases. Property-based tests verify universal properties across all valid inputs. Both are complementary: unit tests catch concrete regressions; property tests verify that invariants hold across the input space.

### Property-based testing library

**[fast-check](https://github.com/dubzzz/fast-check)** — chosen for its browser compatibility (UMD build usable without a bundler), large built-in arbitrary library, and active maintenance. Load via CDN in the test HTML harness.

Each property test runs a minimum of **100 iterations**.

Tag format: `// Feature: expense-tracker-enhancements, Property {N}: {property_text}`

### Unit test areas

- `validator.validateCategory()` with edge-case inputs: empty string, `"   "` (all whitespace), 31-char name, duplicate, valid new name
- `validator.validateThreshold()` with edge-case inputs: `-1`, `"abc"`, `0`, `999999999.99`, `1000000000`
- `storage.loadCategories()` when localStorage has corrupted JSON → returns `[]`
- `storage.loadThresholds()` when localStorage has corrupted JSON → returns `{}`
- `ui.renderMonthSelector()` when all transactions have malformed `createdAt` → defaults to "All"
- Built-in category delete button absence (snapshot check)
- Theme toggle: no persisted theme + OS dark preference → applies dark mode
- Theme toggle: no persisted theme + no OS preference → applies light mode

### Property tests (mapped to Correctness Properties)

| Property | Arbitraries | What varies |
|---|---|---|
| 1 (category add round-trip) | `fc.string({minLength:1,maxLength:30})` filtered to printable | Random valid names |
| 2 (invalid names rejected) | empty string, `fc.string().filter(s => s.trim()==='')`, `fc.string({minLength:31})` | All invalid shapes |
| 3 (duplicate rejection) | `fc.string()` + case permutation generator | All case combos |
| 4 (count invariant) | sequence of add/delete ops | Many operations |
| 5 (delete preserves transactions) | `fc.array(transactionArb)` + category pick | Random tx sets |
| 6 (month selector options) | `fc.array(transactionArb)` | Random tx sets |
| 7 (month filter correctness) | `fc.array(transactionArb)`, `fc.string()` month | Random month picks |
| 8 ("All" shows everything) | `fc.array(transactionArb)` | Random tx sets |
| 9 (new tx respects filter) | transaction + month filter combos | Match/no-match cases |
| 10 (sort does not mutate storage) | `fc.array(transactionArb)`, `fc.constantFrom(...sortKeys)` | All sort keys |
| 11 (sort maintained after mutate) | `fc.array(transactionArb)`, sort key, add/delete | Random tx sets |
| 12 (amount sort with tiebreaker) | `fc.array(transactionArb)` with ties | Ties and non-ties |
| 13 (category sort case-insensitive) | `fc.array(transactionArb)` with mixed-case categories | Case variations |
| 14 (sort + filter compose) | `fc.array(transactionArb)`, month, sort key | All combinations |
| 15 (threshold persistence round-trip) | `fc.float({min:0,max:999999999.99})` | Random valid values |
| 16 (indicator activates) | threshold T, tx generating total ≥ T | Values near threshold |
| 17 (indicator deactivates) | threshold T, tx generating total < T | Values below threshold |
| 18 (invalid threshold rejected) | negative numbers, NaN, non-numeric strings | All invalid shapes |
| 19 (indicator recalculates) | threshold update + tx totals | New threshold values |
| 20 (theme toggle round-trip) | `fc.constantFrom('light', 'dark')` | Both initial states |
| 21 (theme restore on init) | `fc.constantFrom('light', 'dark')` | Both themes |
| 22 (aria-pressed reflects theme) | toggle sequence | Multiple toggles |

### Integration / smoke tests

- App loads with no localStorage data (clean state)
- App loads with all three new localStorage keys pre-populated
- Threshold panel renders for dynamically added custom categories
- Category deletion cascades threshold removal from localStorage
- Chart updates correctly when category list changes
