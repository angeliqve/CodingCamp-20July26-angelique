# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, organize them by category, and visualize spending distribution through a pie chart. The application uses browser Local Storage for persistence, requires no backend server, and is built with plain HTML, CSS, and vanilla JavaScript. It is designed to be simple, fast, and usable as a standalone web page or browser extension.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense entry consisting of an item name, a monetary amount, and a category
- **Category**: A classification label for a transaction; one of: Food, Transport, or Fun
- **Transaction_List**: The scrollable list displaying all recorded transactions
- **Input_Form**: The HTML form through which the user enters a new transaction
- **Balance_Display**: The UI element that shows the current total of all transaction amounts
- **Chart**: The pie chart that visualizes spending distribution by category
- **Local_Storage**: The browser's built-in Web Storage API used for client-side data persistence
- **Validator**: The form validation logic that enforces required field rules before submission

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter expense details through a form, so that I can record my spending quickly and accurately.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (maximum 100 characters), a numeric field for amount, and a dropdown selector for category (Food, Transport, Fun).
2. WHEN the user submits the Input_Form with all fields filled and an amount between 0.01 and 999,999,999.99, THE App SHALL add the transaction to the Transaction_List and persist it to Local_Storage within 500ms.
3. WHEN the user submits the Input_Form with one or more empty fields, THE Validator SHALL display an inline error message indicating which fields are missing and SHALL NOT add a transaction.
4. WHEN the user submits the Input_Form with a non-positive, non-numeric, or out-of-range value in the amount field, THE Validator SHALL display an error message and SHALL NOT add a transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields within 200ms: the item name field SHALL be empty, the amount field SHALL be empty, and the category dropdown SHALL revert to its default unselected state.
6. IF Local_Storage is unavailable when the user submits the Input_Form, THE App SHALL display an error message indicating the transaction could not be saved and SHALL NOT add the transaction to the Transaction_List.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see a scrollable list of all my recorded transactions, so that I can review and manage my expense history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display all stored transactions in reverse chronological order (most recently added first), each showing the item name (truncated at 100 characters if needed), amount formatted to 2 decimal places with a currency symbol, and category.
2. WHILE the number of transactions exceeds the visible area of the Transaction_List container, THE Transaction_List SHALL be independently scrollable without causing layout changes to elements outside the list container.
3. WHEN the user clicks the delete button on a transaction entry, THE App SHALL remove that transaction from the Transaction_List and from Local_Storage, and all remaining transactions SHALL remain visible and unchanged.
4. IF Local_Storage deletion fails, THE App SHALL retain the transaction in the Transaction_List and display an error message indicating the deletion could not be completed.
5. WHEN no transactions are present, THE Transaction_List SHALL display a message indicating that no expenses have been recorded yet.

---

### Requirement 3: Total Balance Display

**User Story:** As a user, I want to see my current total spending at a glance, so that I can monitor my overall expenditure without manual calculation.

#### Acceptance Criteria

1. THE Balance_Display SHALL show the sum of all transaction amounts formatted to 2 decimal places with a currency symbol prefix.
2. WHEN a transaction is added or deleted, THE Balance_Display SHALL update automatically within 1 second to reflect the new total without requiring a page reload.
3. WHEN no transactions are present, THE Balance_Display SHALL show a total of zero formatted to 2 decimal places with a currency symbol prefix (e.g., $0.00).

---

### Requirement 4: Spending Distribution Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going visually.

#### Acceptance Criteria

1. THE Chart SHALL render as a pie chart where each segment's arc is proportional to that category's percentage of the total spending amount.
2. WHEN a transaction is added or deleted, THE Chart SHALL update automatically within 1 second to reflect the current category totals without requiring a page reload.
3. WHEN only one category has transactions, THE Chart SHALL display a full single-segment chart (100%) for that category.
4. WHEN no transactions are present, THE Chart SHALL display a placeholder message in place of the chart indicating no data is available.
5. THE Chart SHALL use a chart library loaded via CDN, requiring no local build tooling or package installation.
6. THE Chart SHALL display a legend identifying each category by a visually distinct color; if more than one category is present, each category SHALL use a different color, supporting up to 3 categories (Food, Transport, Fun).

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I do not lose my data when I close or refresh the browser.

#### Acceptance Criteria

1. WHEN the App initializes, THE App SHALL read all stored transactions from Local_Storage and render them in the Transaction_List, Balance_Display, and Chart.
2. WHEN a transaction is added, THE App SHALL write the updated transaction list to Local_Storage before updating the Transaction_List, Balance_Display, and Chart.
3. WHEN a transaction is deleted, THE App SHALL write the updated transaction list to Local_Storage before updating the Transaction_List, Balance_Display, and Chart.
4. IF Local_Storage is unavailable or returns a parse error on initialization, THEN THE App SHALL initialize with an empty transaction list and display a non-blocking warning indicating that saved data could not be loaded.
5. IF a Local_Storage write operation fails, THE App SHALL display a non-blocking warning and preserve the current UI state without reflecting the failed change.
6. THE App SHALL use a consistent storage key for all read and write operations so that data written during add or delete is the same data read during initialization.

---

### Requirement 6: Browser Compatibility and Responsiveness

**User Story:** As a user, I want the app to work correctly across modern browsers and on different screen sizes, so that I can use it on any device.

#### Acceptance Criteria

1. THE App SHALL function correctly in current stable releases of Chrome, Firefox, Edge, and Safari, meaning all interactive elements respond to user input, all content is visible, and no console errors are thrown during normal operation.
2. THE App SHALL render without layout breakage on viewport widths from 320px to 1920px, where "layout breakage" means no content is clipped or obscured, no text overflows its container, and all interactive elements remain accessible.
3. THE App SHALL load and become interactive within 3 seconds on a connection of at least 25 Mbps download / 3 Mbps upload, where "interactive" means the Input_Form accepts input and the Transaction_List is rendered, excluding third-party CDN load time.
4. THE App SHALL adapt its layout across three breakpoints: mobile (320px–767px), tablet (768px–1023px), and desktop (1024px–1920px), with no horizontal scrollbar at any of these widths.
5. IF the user's browser does not support a required feature (such as Local_Storage), THE App SHALL display a non-blocking warning message indicating which feature is unavailable and that full functionality may be limited.
