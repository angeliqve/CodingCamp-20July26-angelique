# Requirements Document

## Introduction

This document specifies five enhancements to the existing Expense & Budget Visualizer — a client-side, single-page web application built with plain HTML, CSS, and vanilla JavaScript that stores data in browser `localStorage`. The enhancements are: (1) user-defined custom categories, (2) a monthly summary view, (3) transaction sorting by amount or category, (4) per-category and total budget thresholds with visual alerts, and (5) a dark/light mode toggle. All enhancements must integrate with the existing IIFE-based module architecture (`storage`, `validator`, `state`, `ui`, `events`) and must not introduce build tooling or external frameworks.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry with fields `id`, `name`, `amount`, `category`, and `createdAt`
- **Category**: A classification label attached to a transaction; may be one of the three built-in categories or any user-created custom category
- **Built-in_Category**: One of the three pre-defined categories shipped with the App: Food, Transport, Fun
- **Custom_Category**: A user-defined category name created through the Category_Manager
- **Category_Manager**: The UI panel through which the user adds and deletes custom categories
- **Transaction_List**: The scrollable list that displays recorded transactions
- **Input_Form**: The HTML form used to enter a new transaction
- **Category_Dropdown**: The `<select>` element inside the Input_Form that lists available categories
- **Monthly_Summary**: A view that groups and displays transactions filtered to a single calendar month
- **Month_Selector**: The UI control (e.g., a `<select>` or `<input type="month">`) used to choose the month displayed in the Monthly_Summary
- **Sort_Control**: The UI control that determines the order in which transactions appear in the Transaction_List
- **Budget_Threshold**: A user-defined maximum spending amount associated with either a single category or with total spending
- **Threshold_Indicator**: The visual element that highlights a category or total balance when spending meets or exceeds the Budget_Threshold
- **Theme_Toggle**: The button or switch that switches the App between light mode and dark mode
- **Local_Storage**: The browser's Web Storage API used for all client-side persistence
- **Validator**: The form validation logic that enforces field rules before submission
- **Balance_Display**: The UI element showing the current sum of all transaction amounts
- **Chart**: The pie chart visualizing spending distribution by category

---

## Requirements

### Requirement 1: Custom Categories

**User Story:** As a user, I want to create my own spending categories beyond the three defaults, so that I can organise my expenses in a way that reflects my personal spending habits.

#### Acceptance Criteria

1. THE App SHALL provide a Category_Manager UI element that allows the user to type a new category name (1–30 characters, printable non-whitespace only) and submit it.
2. WHEN the user submits a valid new category name through the Category_Manager, THE App SHALL add that category to the Category_Dropdown within 500 ms and persist the updated category list to Local_Storage.
3. WHEN the user submits a category name that is empty, exceeds 30 characters, or consists solely of whitespace characters, THE Validator SHALL display an inline error message indicating the name requirements and SHALL NOT add the category.
4. WHEN the user submits a category name that matches an existing category name (case-insensitive), THE Validator SHALL display an inline error message indicating the name is already in use and SHALL NOT add the category.
5. THE App SHALL display all custom categories in the Category_Dropdown alongside the Built-in_Category options; the combined list SHALL contain no more than 50 categories total and SHALL remain usable for new transaction entries.
6. WHEN the user deletes a custom category through the Category_Manager, THE App SHALL remove that category from the Category_Dropdown and from Local_Storage within 500 ms, and SHALL NOT delete any existing transactions that were recorded under that category.
7. THE App SHALL NOT permit the user to delete a Built-in_Category (Food, Transport, Fun) through the Category_Manager, and SHALL NOT render a delete control adjacent to Built-in_Category entries in the Category_Manager.
8. WHEN the App initialises, THE App SHALL load previously persisted custom categories from Local_Storage and populate the Category_Dropdown before the user can submit a transaction.
9. IF Local_Storage is unavailable or the save operation fails when the user attempts to save or delete a custom category, THE App SHALL display a non-blocking error banner and SHALL NOT modify the Category_Dropdown.

---

### Requirement 2: Monthly Summary View

**User Story:** As a user, I want to filter and view my transactions grouped by calendar month, so that I can understand my spending patterns over time.

#### Acceptance Criteria

1. THE App SHALL provide a Month_Selector control that lets the user choose a specific year-month (e.g., 2025-07) from the months represented in the transaction history, plus an "All" option that shows every transaction.
2. WHEN the user selects a month using the Month_Selector, THE Transaction_List SHALL display only transactions whose `createdAt` timestamp falls within that calendar month within 500 ms, and the Balance_Display and Chart SHALL update to reflect only that month's transactions.
3. WHEN the user selects "All" using the Month_Selector, THE Transaction_List SHALL display all transactions, and the Balance_Display and Chart SHALL reflect total spending across all months.
4. WHEN a new transaction is added while a specific month filter is active, THE App SHALL include the new transaction in the filtered view only if its `createdAt` month matches the currently selected month.
5. WHEN a transaction is deleted while a specific month filter is active, THE Transaction_List SHALL remove that transaction immediately and update the Balance_Display and Chart for the active month filter.
6. THE Monthly_Summary SHALL display the total spending amount for the selected month alongside the filtered Transaction_List.
7. WHEN no transactions exist for the selected month, THE Transaction_List SHALL display the message "No expenses recorded for this period."
8. WHEN the transaction history contains no transactions, THE Month_Selector SHALL display only the "All" option and SHALL default to the "All" selection.
9. IF the Month_Selector fails to populate from the transaction history (e.g., due to a parse error), THE App SHALL default the Month_Selector to "All" and display the unfiltered Transaction_List so the user is never left with a broken view.

---

### Requirement 3: Transaction Sorting

**User Story:** As a user, I want to sort my transaction list by amount or by category, so that I can quickly find the most expensive items or group similar expenses together.

#### Acceptance Criteria

1. THE App SHALL provide a Sort_Control that offers the following sort options: "Date (newest first)" (default), "Date (oldest first)", "Amount (high to low)", "Amount (low to high)", "Category (A–Z)", and "Category (Z–A)".
2. WHEN the user selects a sort option from the Sort_Control, THE Transaction_List SHALL re-render with transactions in the chosen order within 500 ms without modifying the stored transaction data.
3. WHEN a new transaction is added, THE Transaction_List SHALL maintain the currently active sort order after re-rendering.
4. WHEN a transaction is deleted, THE Transaction_List SHALL maintain the currently active sort order after re-rendering.
5. WHEN the Sort_Control is set to "Amount (high to low)", THE Transaction_List SHALL display the transaction with the largest `amount` value first; transactions with equal `amount` values SHALL be sorted by `createdAt` descending as a secondary criterion.
6. WHEN the Sort_Control is set to "Amount (low to high)", THE Transaction_List SHALL display the transaction with the smallest `amount` value first; transactions with equal `amount` values SHALL be sorted by `createdAt` descending as a secondary criterion.
7. WHEN the Sort_Control is set to "Category (A–Z)", THE Transaction_List SHALL display transactions in case-insensitive ascending alphabetical order by their `category` field; transactions within the same category SHALL be sorted by `createdAt` descending as a secondary criterion.
8. WHEN the Sort_Control is set to "Category (Z–A)", THE Transaction_List SHALL display transactions in case-insensitive descending alphabetical order by their `category` field; transactions within the same category SHALL be sorted by `createdAt` descending as a secondary criterion.
9. THE Sort_Control and the monthly filter (Requirement 2) SHALL operate independently and composably, so that the displayed list always reflects both the active month filter and the active sort order simultaneously.
10. WHEN no transactions are present after applying the active month filter, THE Sort_Control SHALL remain visible and selectable but THE Transaction_List SHALL display the empty-state message defined in Requirement 2 Criterion 7.

---

### Requirement 4: Budget Thresholds and Spending Alerts

**User Story:** As a user, I want to set spending limits for each category and for my total expenses, so that I can see at a glance when I am approaching or have exceeded my budget.

#### Acceptance Criteria

1. THE App SHALL provide a threshold input for each available category (including custom categories) and a separate input for total spending, each accepting a positive numeric value up to 999,999,999.99 or the value 0 to indicate no threshold is set.
2. WHEN the user saves a Budget_Threshold for a category or for total spending, THE App SHALL persist the threshold value to Local_Storage within 500 ms.
3. WHEN the total spending amount meets or exceeds the total Budget_Threshold (and the total threshold is non-zero), THE Threshold_Indicator on the Balance_Display SHALL activate, visually distinguishing the balance value from its normal appearance (e.g., a red colour or warning icon).
4. WHEN the spending total for a specific category meets or exceeds that category's Budget_Threshold (and that threshold is non-zero), THE Threshold_Indicator for that category SHALL activate in the Chart legend and in any category summary element.
5. WHEN spending drops below a Budget_Threshold (e.g., after a transaction is deleted), THE Threshold_Indicator SHALL deactivate and the element SHALL return to its normal appearance within 1 second.
6. WHEN the App initialises, THE App SHALL load all persisted Budget_Threshold values from Local_Storage within 500 ms and apply Threshold_Indicator states immediately based on current transaction data.
7. WHEN a custom category is deleted (per Requirement 1), THE App SHALL also remove the Budget_Threshold associated with that category from Local_Storage within 500 ms.
8. IF the user enters a non-numeric or negative value in a threshold input, THE Validator SHALL display an inline error message adjacent to that input field and SHALL NOT save the threshold value to Local_Storage.
9. IF Local_Storage is unavailable or the write operation fails when the user saves a Budget_Threshold, THE App SHALL display a non-blocking error banner and SHALL NOT update the displayed Threshold_Indicator state.
10. WHEN the user updates an existing Budget_Threshold to a new valid value, THE App SHALL re-evaluate all Threshold_Indicator states within 1 second and persist the new value to Local_Storage within 500 ms.
11. WHEN the user saves an empty value in a threshold input field, THE App SHALL treat the empty value as 0 (no threshold set) and SHALL persist 0 to Local_Storage, clearing any previously active Threshold_Indicator for that input.

---

### Requirement 5: Dark / Light Mode Toggle

**User Story:** As a user, I want to switch between a dark and a light colour scheme, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a Theme_Toggle control that is visible and operable on all pages and switches the App between light mode and dark mode when activated.
2. WHEN the user activates the Theme_Toggle, THE App SHALL apply the selected colour scheme to all visible page elements within 300 ms without requiring a page reload.
3. WHEN the user activates the Theme_Toggle, THE App SHALL persist the selected theme preference (`"light"` or `"dark"`) to Local_Storage.
4. WHEN the App initialises, THE App SHALL read the persisted theme preference from Local_Storage and apply it before the first render, so that no flash of the wrong theme occurs during page load.
5. IF no persisted theme preference exists in Local_Storage, THE App SHALL apply the theme that matches the user's OS-level colour scheme preference (`prefers-color-scheme` media query).
6. IF neither a persisted preference nor an OS-level preference can be determined, THE App SHALL default to light mode.
7. THE dark mode colour scheme SHALL meet a minimum contrast ratio of 4.5:1 for all body text against its background, as defined by WCAG 2.1 Level AA.
8. THE light mode colour scheme SHALL meet a minimum contrast ratio of 4.5:1 for all body text against its background, as defined by WCAG 2.1 Level AA.
9. WHEN the user switches themes, THE Theme_Toggle control SHALL update its `aria-pressed` attribute to `"true"` when dark mode is active and `"false"` when light mode is active.
10. THE Theme_Toggle SHALL remain accessible and operable at all three responsive breakpoints (mobile 320–767 px, tablet 768–1023 px, desktop 1024–1920 px), with a minimum touch/click target size of 44×44 px at every breakpoint.
