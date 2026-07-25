# Implementation Plan: Expense Tracker Enhancements

## Overview

All changes are applied to the three existing files — `index.html`, `app.js`, and `app.css` — following the additive, module-first design. Tasks follow the natural dependency order: HTML skeleton additions first, then CSS, then JS layer by layer (storage → validator → state → ui → events/wiring), with a final integration checkpoint. No new files, no npm, no bundler.

## Tasks

- [x] 1. Add HTML structural elements for all five new features
  - Add `<button id="theme-toggle">` with `aria-pressed="false"` and `aria-label="Switch to dark mode"` immediately after `<body>` open, before `#notification-banner`
  - Add `<section id="category-manager">` card (with `#new-category-name` input, `#add-category-btn`, `#category-list`) inside `.app-grid` after the form section
  - Add `.month-filter-row` div (with `#month-selector` select and `#month-total` span) inside `.list-section` card, above `#transaction-list`
  - Add `.sort-row` div (with `#sort-control` select and its six static `<option>` values) inside `.list-section`, between the month filter row and the transaction list
  - Add `<section id="threshold-panel">` card (with `#threshold-list` div and `.threshold-hint` paragraph) as a new card inside `.app-grid`
  - _Requirements: 1.1, 1.7, 2.1, 3.1, 4.1, 5.1, 5.10_

- [x] 2. Add CSS rules for dark mode and all new UI components
  - [x] 2.1 Add dark mode tokens and theme toggle styles
    - Add `[data-theme="dark"]` block on `:root` overriding `--color-bg`, `--color-surface`, `--color-border`, `--color-text`, `--color-text-muted`, `--color-text-placeholder` with WCAG AA-compliant dark values
    - Add `.theme-toggle` rule: fixed/absolute position (top-right), `min-width: 2.75rem; min-height: 2.75rem`, visible at all three breakpoints
    - _Requirements: 5.1, 5.2, 5.7, 5.8, 5.10_
  - [x] 2.2 Add category manager styles
    - Add `.category-manager-section` card layout
    - Add `#category-list li` row styles (name span, read-only badge for built-ins, delete button matching `.tx-delete`)
    - Add `.badge-dynamic` base class for runtime-colored badges using inline `style` from `CATEGORY_PALETTE`
    - _Requirements: 1.1, 1.7_
  - [x] 2.3 Add month selector and sort control styles
    - Add `.month-filter-row` flex row with label, select, and `#month-total` span
    - Add `.sort-row` flex row with label and select
    - Reuse existing `.field select` appearance rules; add `.month-total` typography class
    - _Requirements: 2.1, 3.1_
  - [x] 2.4 Add threshold panel and threshold-exceeded indicator styles
    - Add `.threshold-section` card layout
    - Add `.threshold-row` flex row (label, input, save button, indicator span)
    - Add `.threshold-exceeded` class that applies `color: var(--color-error)` and a `⚠` indicator
    - Add `#balance-display.threshold-exceeded` override for the balance total
    - _Requirements: 4.1, 4.3, 4.4, 4.5_

- [~] 3. Extend storage module with category, threshold, and theme helpers
  - [x] 3.1 Add category storage functions
    - Add constants `CATEGORIES_KEY = 'expense_categories_v1'`
    - Add `loadCategories()`: reads and JSON-parses `CATEGORIES_KEY`; returns `[]` on any failure
    - Add `saveCategories(categories)`: JSON-stringifies and writes to `CATEGORIES_KEY`; returns `false` on error
    - _Requirements: 1.2, 1.8, 1.9_
  - [~] 3.2 Add threshold storage functions
    - Add constants `THRESHOLDS_KEY = 'expense_thresholds_v1'`
    - Add `loadThresholds()`: reads and JSON-parses `THRESHOLDS_KEY`; returns `{}` on any failure
    - Add `saveThresholds(thresholds)`: JSON-stringifies and writes to `THRESHOLDS_KEY`; returns `false` on error
    - _Requirements: 4.2, 4.6, 4.9_
  - [-] 3.3 Add theme storage functions
    - Add constants `THEME_KEY = 'expense_theme_v1'`
    - Add `loadTheme()`: reads raw string from `THEME_KEY`; returns `null` on failure (caller resolves via OS preference)
    - Add `saveTheme(theme)`: writes raw string `"light"` or `"dark"`; fails silently (non-critical)
    - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [ ] 4. Extend validator module with category and threshold validators; update validateForm
  - [-] 4.1 Add validateCategory function
    - Implement `validateCategory(name, existingCategories)` returning `{ valid, error }`
    - Reject empty string, whitespace-only, names > 30 chars (Req 1.3)
    - Reject case-insensitive duplicates against `existingCategories` array (Req 1.4)
    - _Requirements: 1.3, 1.4_
  - [ ]* 4.2 Write unit tests for validateCategory
    - Test: empty string → rejected; `"   "` → rejected; 31-char name → rejected
    - Test: exact duplicate → rejected; case-permutation duplicate → rejected
    - Test: valid 1-char name → accepted; valid 30-char name → accepted
    - _Requirements: 1.3, 1.4_
  - [-] 4.3 Add validateThreshold function
    - Implement `validateThreshold(value)` returning `{ valid, error }`
    - Reject non-numeric, negative, or values > 999,999,999.99 (Req 4.8)
    - Accept 0 (means "disabled") and any positive finite number within range
    - _Requirements: 4.8_
  - [ ]* 4.4 Write unit tests for validateThreshold
    - Test: `"-1"` → rejected; `"abc"` → rejected; `""` treated as 0 → accepted
    - Test: `"0"` → accepted; `"999999999.99"` → accepted; `"1000000000"` → rejected
    - _Requirements: 4.8_
  - [-] 4.5 Update validateForm to accept dynamic category list
    - Add optional second parameter `validCategories` (defaults to `BUILTIN_CATEGORIES`)
    - Replace the hardcoded `VALID_CATEGORIES` check with `validCategories.includes(category)`
    - Update error message to reflect dynamic options
    - _Requirements: 1.5_

- [ ] 5. Extend state module with categories, thresholds, ephemeral sort/filter state, and helpers
  - [-] 5.1 Add category state and operations
    - Add `let categories = []` (custom categories array of `{ name, colorIndex }`)
    - Add `BUILTIN_CATEGORIES = ['Food', 'Transport', 'Fun']` constant
    - Add `CATEGORY_PALETTE` 8-color array constant
    - Add `addCategory(name)`: validates via `validator.validateCategory`, appends `{ name, colorIndex: categories.length % 8 }`, calls `storage.saveCategories`; shows banner and returns `false` on storage failure
    - Add `deleteCategory(name)`: filters from `categories`, removes matching key from `state.thresholds`, calls `storage.saveCategories` and `storage.saveThresholds`; calls `renderAll()`
    - Expose `get categories()` getter
    - _Requirements: 1.2, 1.4, 1.5, 1.6, 1.8, 4.7_
  - [-] 5.2 Add threshold state and operations
    - Add `let thresholds = {}` (keyed by category name and `__total__`)
    - Add `setThreshold(key, value)`: validates via `validator.validateThreshold`, stores in `thresholds`, calls `storage.saveThresholds`; shows banner and returns `false` on storage failure
    - Expose `get thresholds()` getter
    - _Requirements: 4.1, 4.2, 4.9, 4.10, 4.11_
  - [-] 5.3 Add ephemeral sort and month-filter state
    - Add `let sortKey = 'date-desc'` and `let activeMonth = null`
    - Add `setSortKey(key)`: updates `sortKey`, calls `renderAll()`
    - Add `setActiveMonth(month)`: updates `activeMonth` (null = "All"), calls `renderAll()`
    - Add `getSortedFiltered(txArray)`: pure function — filters `txArray` by `activeMonth` then sorts by `sortKey`; `date-desc` sorts by `createdAt` descending; `date-asc` ascending; `amount-desc/asc` by amount with `createdAt` tiebreaker; `category-asc/desc` case-insensitive with `createdAt` tiebreaker
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_
  - [ ]* 5.4 Write property test for getSortedFiltered — sort does not mutate stored data (Property 10)
    - **Property 10: Sort does not mutate stored data**
    - **Validates: Requirements 3.2**
  - [ ]* 5.5 Write property test for getSortedFiltered — sort maintained after add/delete (Property 11)
    - **Property 11: Sort order is maintained after add and delete**
    - **Validates: Requirements 3.3, 3.4**
  - [ ]* 5.6 Write property test for getSortedFiltered — amount sort tiebreaker (Property 12)
    - **Property 12: Amount sort correctness with tiebreaker**
    - **Validates: Requirements 3.5, 3.6**
  - [ ]* 5.7 Write property test for getSortedFiltered — category sort case-insensitive tiebreaker (Property 13)
    - **Property 13: Category sort is case-insensitive with tiebreaker**
    - **Validates: Requirements 3.7, 3.8**
  - [ ]* 5.8 Write property test for getSortedFiltered — sort and month filter compose (Property 14)
    - **Property 14: Sort and month filter compose correctly**
    - **Validates: Requirements 3.9**
  - [~] 5.9 Update balance() and totals() to accept optional transaction array
    - Change `balance()` signature to `balance(txArray = transactions)` — compute from provided array
    - Change `totals()` signature to `totals(txArray = transactions, categoryList = allCategories())` — iterate all categories including custom
    - Add `allCategories()` private helper returning `BUILTIN_CATEGORIES.concat(categories.map(c => c.name))`
    - Update `state.load()` to also call `storage.loadCategories`, `storage.loadThresholds`
    - _Requirements: 1.5, 2.2, 2.6, 4.3, 4.4_
  - [ ]* 5.10 Write property test for month filter correctness (Property 7)
    - **Property 7: Month filter correctness**
    - **Validates: Requirements 2.2, 2.6**
  - [ ]* 5.11 Write property test for "All" filter shows every transaction (Property 8)
    - **Property 8: "All" filter shows every transaction**
    - **Validates: Requirements 2.3**
  - [ ]* 5.12 Write property test for new transaction respects active month filter (Property 9)
    - **Property 9: New transaction respects active month filter**
    - **Validates: Requirements 2.4**
  - [ ]* 5.13 Write property test for threshold persistence round-trip (Property 15)
    - **Property 15: Threshold persistence round-trip**
    - **Validates: Requirements 4.2**
  - [ ]* 5.14 Write property test for threshold indicator activates when spending ≥ threshold (Property 16)
    - **Property 16: Threshold indicator activates when spending ≥ threshold**
    - **Validates: Requirements 4.3, 4.4**
  - [ ]* 5.15 Write property test for threshold indicator deactivates when spending < threshold (Property 17)
    - **Property 17: Threshold indicator deactivates when spending < threshold**
    - **Validates: Requirements 4.5**
  - [ ]* 5.16 Write property test for invalid threshold values are always rejected (Property 18)
    - **Property 18: Invalid threshold values are always rejected**
    - **Validates: Requirements 4.8**

- [ ] 6. Extend ui module with new render functions and update existing ones
  - [~] 6.1 Add applyTheme function
    - Implement `applyTheme(theme)`: sets `document.documentElement.setAttribute('data-theme', theme)`, updates `#theme-toggle` `aria-pressed` and `aria-label`, updates `.theme-icon` text (`🌙` / `☀️`)
    - _Requirements: 5.2, 5.4, 5.9_
  - [ ]* 6.2 Write property test for theme toggle aria-pressed reflects active theme (Property 22)
    - **Property 22: Theme toggle aria-pressed reflects active theme**
    - **Validates: Requirements 5.9**
  - [~] 6.3 Add renderCategoryManager function
    - Implement `renderCategoryManager(categories)`: rebuilds `#category-list`; renders built-in categories as read-only `<li>` items with no delete button; renders custom categories with a delete `<button data-category>` and a color swatch from `CATEGORY_PALETTE`
    - _Requirements: 1.1, 1.5, 1.7_
  - [ ]* 6.4 Write property test for valid category addition round-trip (Property 1)
    - **Property 1: Valid category name addition round-trip**
    - **Validates: Requirements 1.2, 1.8**
  - [ ]* 6.5 Write property test for invalid category names are always rejected (Property 2)
    - **Property 2: Invalid category names are always rejected**
    - **Validates: Requirements 1.3**
  - [ ]* 6.6 Write property test for duplicate category names are always rejected (Property 3)
    - **Property 3: Duplicate category names are always rejected (case-insensitive)**
    - **Validates: Requirements 1.4**
  - [ ]* 6.7 Write property test for category count invariant (Property 4)
    - **Property 4: Category count invariant**
    - **Validates: Requirements 1.5**
  - [ ]* 6.8 Write property test for custom category deletion preserves transactions (Property 5)
    - **Property 5: Custom category deletion preserves transactions**
    - **Validates: Requirements 1.6**
  - [~] 6.9 Add renderMonthSelector function
    - Implement `renderMonthSelector(transactions, activeMonth)`: derives sorted distinct `YYYY-MM` strings from `createdAt` fields (skipping malformed dates), rebuilds `#month-selector` options (`"all"` + derived months), re-selects `activeMonth`, updates `#month-total` with the filtered balance
    - Defaults to `"All"` if derivation fails entirely (Req 2.9)
    - _Requirements: 2.1, 2.6, 2.7, 2.8, 2.9_
  - [ ]* 6.10 Write property test for month selector options equal distinct transaction months (Property 6)
    - **Property 6: Month selector options equal distinct transaction months**
    - **Validates: Requirements 2.1**
  - [~] 6.11 Add renderSortControl function
    - Implement `renderSortControl(sortKey)`: reads `#sort-control` select and ensures the current `sortKey` option is selected (idempotent — options are static in HTML)
    - _Requirements: 3.1_
  - [~] 6.12 Add renderThresholdPanel function
    - Implement `renderThresholdPanel(categories, thresholds, currentTotals)`: rebuilds `#threshold-list` with one row per category (built-ins + custom) plus a `__total__` row; each row has label, number input pre-filled from `thresholds`, a save button, an inline error `<span>`, and a `.threshold-indicator` `<span>` toggled with `.threshold-exceeded` when spending ≥ threshold (and threshold ≠ 0)
    - _Requirements: 4.1, 4.3, 4.4, 4.5, 4.6_
  - [~] 6.13 Update renderBalanceDisplay to show threshold-exceeded indicator
    - Add second parameter `isExceeded` (boolean); when `true`, add `.threshold-exceeded` class (and `⚠` prefix or red color) to `#balance-display`; when `false`, remove it
    - _Requirements: 4.3, 4.5_
  - [~] 6.14 Update renderChart for dynamic category colors and threshold indicators
    - Update `renderChart(totals, chartInstance, categories, thresholds)` to accept `categories` array
    - Derive `labels` from `allCategories()` filtered to those with non-zero totals
    - Derive `backgroundColor` from each category's `colorIndex` into `CATEGORY_PALETTE` (built-ins keep original hex colors)
    - _Requirements: 1.5, 4.4_
  - [ ]* 6.15 Write unit tests for renderMonthSelector edge case — all malformed dates defaults to "All"
    - Test: all transactions have `createdAt = "invalid"` → `#month-selector` has only "all" option selected
    - _Requirements: 2.9_
  - [ ]* 6.16 Write unit tests for applyTheme — OS preference fallback
    - Test: no persisted theme, `prefers-color-scheme: dark` → `data-theme="dark"` applied
    - Test: no persisted theme, no OS preference → `data-theme="light"` applied
    - _Requirements: 5.5, 5.6_

- [ ] 7. Wire events, update renderAll pipeline, and update initApp
  - [~] 7.1 Wire category manager events
    - In `events.init()`, attach click listener on `#add-category-btn`: reads `#new-category-name`, calls `state.addCategory(name)`, clears input and inline error on success; shows inline error via `ui.showInlineErrors` on failure
    - Attach delegated click listener on `#category-list` for `[data-category]` delete buttons: calls `state.deleteCategory(category)` and re-populates `#category` select
    - After any category change, rebuild the `<option>` list in `#category` select to include all `allCategories()`
    - _Requirements: 1.1, 1.2, 1.6, 1.7_
  - [~] 7.2 Wire month selector and sort control events
    - Attach `change` listener on `#month-selector`: calls `state.setActiveMonth(value === 'all' ? null : value)`
    - Attach `change` listener on `#sort-control`: calls `state.setSortKey(value)`
    - _Requirements: 2.2, 2.3, 3.1, 3.2_
  - [~] 7.3 Wire threshold panel events
    - Attach delegated click listener on `#threshold-list` for save buttons (identified by `data-threshold-key` on sibling input or button itself): reads the number input, calls `state.setThreshold(key, value)`, shows inline error on validation failure, calls `renderAll()` on success
    - _Requirements: 4.1, 4.2, 4.8, 4.9, 4.10, 4.11_
  - [~] 7.4 Wire theme toggle event
    - Attach click listener on `#theme-toggle`: reads current `data-theme` from `document.documentElement`, toggles to opposite value, calls `ui.applyTheme(newTheme)`, calls `storage.saveTheme(newTheme)`
    - _Requirements: 5.2, 5.3, 5.9_
  - [ ]* 7.5 Write property test for theme toggle switches and persists correctly (Property 20)
    - **Property 20: Theme toggle switches and persists correctly**
    - **Validates: Requirements 5.2, 5.3**
  - [ ]* 7.6 Write property test for theme is restored on initialisation (Property 21)
    - **Property 21: Theme is restored on initialisation**
    - **Validates: Requirements 5.4**
  - [~] 7.7 Update renderAll pipeline
    - At the top of `renderAll()`, call `const filtered = state.getSortedFiltered(state.transactions)`
    - Pass `filtered` to `ui.renderTransactionList(filtered)`
    - Pass `filtered` to `state.balance(filtered)` → `ui.renderBalanceDisplay(balance, isExceeded)`
    - Pass `filtered` to `state.totals(filtered)` → `ui.renderChart(totals, chartInstance, state.categories, state.thresholds)`
    - Append `ui.renderCategoryManager(state.categories)`
    - Append `ui.renderMonthSelector(state.transactions, state.activeMonth)`
    - Append `ui.renderSortControl(state.sortKey)`
    - Append `ui.renderThresholdPanel(state.categories, state.thresholds, state.totals(state.transactions))`
    - Compute `isExceeded` for balance display: `state.thresholds.__total__ > 0 && state.balance(state.transactions) >= state.thresholds.__total__`
    - _Requirements: 2.2, 2.6, 3.2, 4.3, 4.4, 4.5, 4.10_
  - [~] 7.8 Update initApp to load theme eagerly before first render
    - In `initApp()`, before `events.init()` and before `state.load()`, call `const savedTheme = storage.loadTheme()` then resolve theme (OS fallback if null) then call `ui.applyTheme(resolvedTheme)`
    - Rebuild `#category` select options after `state.load()` to include loaded custom categories
    - _Requirements: 5.4, 5.5, 5.6, 1.8_

- [~] 8. Integration checkpoint — verify all five features work end-to-end
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify: theme toggle persists across page reload; custom categories appear in dropdown and survive reload; month selector shows only months with transactions; sort control reorders list without altering localStorage; threshold indicators activate and deactivate correctly after add/delete
  - Fix any integration issues discovered during this checkpoint

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All code changes go into the three existing files only — no new files, no npm, no bundler
- `BUILTIN_CATEGORIES` and `CATEGORY_PALETTE` are constants in the IIFE closure, not in any module's return value
- The `allCategories()` helper is a private closure-level helper, not exported from the state module
- `getSortedFiltered()` is a pure derivation — it never mutates `state.transactions` or localStorage
- Theme is applied eagerly in `initApp()` before the first `renderAll()` call to prevent FOUT (flash of unstyled theme)
- Property tests use `fast-check` loaded via CDN in a test HTML harness (no build step required)
- Each task references specific requirements for traceability

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3", "2.4", "3.1", "3.2", "3.3"] },
    { "id": 2, "tasks": ["4.1", "4.3", "4.5", "5.1", "5.2", "5.3"] },
    { "id": 3, "tasks": ["4.2", "4.4", "5.4", "5.5", "5.6", "5.7", "5.8", "5.9", "6.1"] },
    { "id": 4, "tasks": ["5.10", "5.11", "5.12", "5.13", "5.14", "5.15", "5.16", "6.3", "6.9", "6.11", "6.12", "6.13", "6.14"] },
    { "id": 5, "tasks": ["6.2", "6.4", "6.5", "6.6", "6.7", "6.8", "6.10", "6.15", "6.16", "7.1", "7.2", "7.3", "7.4"] },
    { "id": 6, "tasks": ["7.5", "7.6", "7.7", "7.8"] },
    { "id": 7, "tasks": ["8"] }
  ]
}
```
