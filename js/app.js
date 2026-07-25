(function () {
  'use strict';

  const STORAGE_KEY = 'expense_visualizer_v1';

  // --- storage module ---
  const storage = (function () {
    // Feature-detect localStorage availability once on module load.
    // Stored in a module-level flag so the detection cost is paid only once.
    let _available = false;
    try {
      const _testKey = '__storage_test__';
      localStorage.setItem(_testKey, '1');
      localStorage.removeItem(_testKey);
      _available = true;
    } catch (e) {
      _available = false;
    }

    /**
     * Reads STORAGE_KEY from localStorage and JSON.parses it.
     * @returns {Array|null} Parsed transaction array, or null on any error.
     */
    function load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null) {
          return [];
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
      } catch (e) {
        return null;
      }
    }

    /**
     * JSON.stringifies the transactions array and writes it to STORAGE_KEY.
     * @param {Array} transactions - The transaction array to persist.
     * @returns {boolean} true on success, false if setItem throws.
     */
    function save(transactions) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
        return true;
      } catch (e) {
        return false;
      }
    }

    return {
      /** Whether localStorage is available in this browser environment. */
      available: _available,
      load,
      save,
    };
  })();

  // --- validator module ---
  const validator = (function () {
    const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

    /**
     * Validates the three form fields before a transaction is created.
     * @param {string} name     - Raw item name input from the form.
     * @param {string} amount   - Raw amount input from the form (string).
     * @param {string} category - Selected category value from the dropdown.
     * @returns {{ valid: boolean, errors: { name?: string, amount?: string, category?: string } }}
     */
    function validateForm(name, amount, category) {
      const errors = {};

      // --- name ---
      const trimmedName = typeof name === 'string' ? name.trim() : '';
      if (trimmedName.length === 0) {
        errors.name = 'Item name is required.';
      } else if (trimmedName.length > 100) {
        errors.name = 'Item name must be 100 characters or fewer.';
      }

      // --- amount ---
      const parsedAmount = Number(amount);
      if (amount === '' || amount === null || amount === undefined || !isFinite(parsedAmount)) {
        errors.amount = 'Amount must be a valid number.';
      } else if (parsedAmount < 0.01) {
        errors.amount = 'Amount must be at least $0.01.';
      } else if (parsedAmount > 999999999.99) {
        errors.amount = 'Amount must not exceed $999,999,999.99.';
      }

      // --- category ---
      if (!VALID_CATEGORIES.includes(category)) {
        errors.category = 'Please select a valid category (Food, Transport, or Fun).';
      }

      const valid = Object.keys(errors).length === 0;
      return { valid, errors };
    }

    return { validateForm };
  })();

  // --- state module ---
  const state = (function () {
    let transactions = [];

    /**
     * Loads transactions from storage on app init.
     * Falls back to empty array if storage returns null or a non-array.
     * Calls renderAll() after loading.
     */
    function load() {
      const result = storage.load();
      if (Array.isArray(result)) {
        transactions = result;
      } else {
        // null means load error (corrupt JSON or localStorage unavailable)
        transactions = [];
        if (result === null) {
          ui.showBanner('Saved data could not be loaded');
        }
      }
      renderAll();
    }

    /**
     * Prepends a new transaction to the in-memory array, persists to storage,
     * and re-renders. If save fails, shows an error banner and rolls back.
     * @param {Object} t - A valid Transaction object.
     * @returns {boolean} true on success, false if the storage save failed.
     */
    function add(t) {
      transactions = [t, ...transactions];
      const saved = storage.save(transactions);
      if (!saved) {
        // Roll back — do not update array or render
        transactions = transactions.slice(1);
        ui.showBanner('Transaction could not be saved');
        return false;
      }
      renderAll();
      return true;
    }

    /**
     * Removes the transaction with the given id, persists to storage,
     * and re-renders. If save fails, restores the original array and shows an error.
     * @param {string} id - The id of the transaction to remove.
     */
    function remove(id) {
      const original = transactions;
      transactions = transactions.filter(function (t) { return t.id !== id; });
      const saved = storage.save(transactions);
      if (!saved) {
        // Restore original array
        transactions = original;
        ui.showBanner('Deletion could not be completed');
        return;
      }
      renderAll();
    }

    /**
     * Returns the arithmetic sum of all transaction amounts.
     * @returns {number} 0 for an empty list.
     */
    function balance() {
      if (transactions.length === 0) return 0;
      return transactions.reduce(function (sum, t) { return sum + t.amount; }, 0);
    }

    /**
     * Returns an object with the spending total for each category.
     * @returns {{ Food: number, Transport: number, Fun: number }}
     */
    function totals() {
      const result = { Food: 0, Transport: 0, Fun: 0 };
      transactions.forEach(function (t) {
        if (Object.prototype.hasOwnProperty.call(result, t.category)) {
          result[t.category] += t.amount;
        }
      });
      return result;
    }

    return {
      // Getter ensures callers always see the latest array reference
      get transactions() { return transactions; },
      load,
      add,
      remove,
      balance,
      totals,
    };
  })();

  // --- ui module ---
  const ui = (function () {

    /**
     * Formats a numeric amount as a USD currency string.
     * @param {number} amount
     * @returns {string} e.g. "$12.50"
     */
    function formatCurrency(amount) {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    }

    /**
     * Maps a category name to its CSS badge class.
     * @param {string} category
     * @returns {string}
     */
    function badgeClass(category) {
      const map = { Food: 'badge-food', Transport: 'badge-transport', Fun: 'badge-fun' };
      return map[category] || '';
    }

    /**
     * Re-builds the transaction list UI from the given transactions array.
     * Transactions are expected to be already in reverse-chronological order.
     * @param {Array} transactions
     */
    function renderTransactionList(transactions) {
      const ul = document.getElementById('transaction-list');
      if (!ul) return;

      // Clear existing content
      ul.innerHTML = '';

      if (transactions.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'tx-empty';
        empty.textContent = 'No expenses recorded yet.';
        ul.appendChild(empty);
        return;
      }

      transactions.forEach(function (t) {
        const li = document.createElement('li');

        const nameSpan = document.createElement('span');
        nameSpan.className = 'tx-name';
        // Name is already validated to ≤100 chars; CSS text-overflow handles truncation
        nameSpan.textContent = t.name;

        const amountSpan = document.createElement('span');
        amountSpan.className = 'tx-amount';
        amountSpan.textContent = formatCurrency(t.amount);

        const badgeSpan = document.createElement('span');
        badgeSpan.className = 'tx-badge ' + badgeClass(t.category);
        badgeSpan.textContent = t.category;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'tx-delete';
        deleteBtn.setAttribute('data-id', t.id);
        deleteBtn.setAttribute('aria-label', 'Delete ' + t.name);
        deleteBtn.textContent = '×';

        li.appendChild(nameSpan);
        li.appendChild(amountSpan);
        li.appendChild(badgeSpan);
        li.appendChild(deleteBtn);

        ul.appendChild(li);
      });
    }

    /** @param {number} balance */
    function renderBalanceDisplay(balance) {
      const el = document.getElementById('balance-display');
      if (!el) return;
      el.textContent = formatCurrency(balance);
    }

    /**
     * @param {{ Food: number, Transport: number, Fun: number }} totals
     * @param {object|null} chartInstance
     * @returns {object|null}
     */
    function renderChart(totals, chartInstance) {
      const canvas = document.getElementById('spending-chart');
      const placeholder = document.getElementById('chart-placeholder');

      // Chart.js not available
      if (typeof window.Chart === 'undefined') {
        if (canvas) canvas.hidden = true;
        if (placeholder) {
          placeholder.hidden = false;
          placeholder.textContent = 'Chart unavailable';
        }
        return null;
      }

      const data = [totals.Food, totals.Transport, totals.Fun];
      const allZero = data.every(function (v) { return v === 0; });

      if (allZero) {
        // Destroy existing chart if present
        if (chartInstance) {
          chartInstance.destroy();
        }
        if (canvas) canvas.hidden = true;
        if (placeholder) {
          placeholder.hidden = false;
          placeholder.textContent = 'No data available.';
        }
        return null;
      }

      // Show canvas, hide placeholder
      if (canvas) canvas.hidden = false;
      if (placeholder) placeholder.hidden = true;

      const chartConfig = {
        type: 'pie',
        data: {
          labels: ['Food', 'Transport', 'Fun'],
          datasets: [{
            data: data,
            backgroundColor: ['#4caf82', '#4a90d9', '#f5a623'],
          }],
        },
        options: {
          plugins: {
            legend: {
              display: true,
            },
          },
        },
      };

      if (chartInstance) {
        chartInstance.data.datasets[0].data = data;
        chartInstance.update();
        return chartInstance;
      }

      return new window.Chart(canvas, chartConfig);
    }

    // Tracks the active auto-dismiss timeout so it can be cleared before setting a new one.
    let _bannerTimeout = null;

    /**
     * Shows a non-blocking notification banner at the top of the page.
     * Auto-dismisses after 5 s; can also be closed manually via the × button.
     * Uses the HTML `hidden` attribute (not a CSS class) to show/hide.
     * The message text and close button are kept as separate child elements so
     * that updating the message on repeated calls never destroys the close button.
     * @param {string} message
     */
    function showBanner(message) {
      const banner = document.getElementById('notification-banner');
      if (!banner) return;

      // Ensure the banner has a dedicated <span> for the message text.
      // This keeps the close button DOM node intact across repeated calls.
      let msgSpan = banner.querySelector('.banner-message');
      if (!msgSpan) {
        msgSpan = document.createElement('span');
        msgSpan.className = 'banner-message';
        banner.appendChild(msgSpan);
      }
      msgSpan.textContent = message;

      // Add close button once; wire it to hide via the `hidden` attribute.
      if (!banner.querySelector('.banner-close')) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'banner-close';
        closeBtn.setAttribute('aria-label', 'Close notification');
        closeBtn.textContent = '×';
        closeBtn.addEventListener('click', function () {
          banner.hidden = true;
          if (_bannerTimeout !== null) {
            clearTimeout(_bannerTimeout);
            _bannerTimeout = null;
          }
        });
        banner.appendChild(closeBtn);
      }

      // Show the banner via the HTML `hidden` attribute.
      banner.hidden = false;

      // Clear any existing timeout before setting a new one.
      if (_bannerTimeout !== null) {
        clearTimeout(_bannerTimeout);
      }
      _bannerTimeout = setTimeout(function () {
        banner.hidden = true;
        _bannerTimeout = null;
      }, 5000);
    }

    function clearInlineErrors() {
      const ids = ['err-name', 'err-amount', 'err-category'];
      ids.forEach(function (id) {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
      });
    }

    /** @param {{ name?: string, amount?: string, category?: string }} errors */
    function showInlineErrors(errors) {
      const fields = { name: 'err-name', amount: 'err-amount', category: 'err-category' };
      Object.keys(fields).forEach(function (key) {
        const el = document.getElementById(fields[key]);
        if (!el) return;
        el.textContent = errors[key] || '';
      });
    }

    return {
      renderTransactionList,
      renderBalanceDisplay,
      renderChart,
      showBanner,
      clearInlineErrors,
      showInlineErrors,
    };
  })();

  // --- renderAll + events + init ---

  // chartInstance lives in the IIFE closure so renderAll and the init block can both access it.
  let chartInstance = null;

  /**
   * Single top-level render coordinator.
   * Called after every state mutation (add, remove, load).
   */
  function renderAll() {
    ui.renderTransactionList(state.transactions);
    ui.renderBalanceDisplay(state.balance());
    chartInstance = ui.renderChart(state.totals(), chartInstance);
  }

  // --- events module ---
  const events = (function () {
    /**
     * Attaches all DOM event listeners.
     * Called once during initialization.
     */
    function init() {
      // 8.1: form submit — validate → create transaction → add to state → reset form
      var form = document.getElementById('transaction-form');
      if (form) {
        form.addEventListener('submit', function (e) {
          e.preventDefault();

          // Extract and trim field values
          var nameInput     = document.getElementById('item-name');
          var amountInput   = document.getElementById('amount');
          var categoryInput = document.getElementById('category');

          var name     = nameInput     ? nameInput.value.trim()     : '';
          var amount   = amountInput   ? amountInput.value.trim()   : '';
          var category = categoryInput ? categoryInput.value        : '';

          // Validate
          var result = validator.validateForm(name, amount, category);
          if (!result.valid) {
            ui.showInlineErrors(result.errors);
            // Set aria-invalid on fields that have errors
            if (nameInput)     nameInput.setAttribute('aria-invalid',     result.errors.name     ? 'true' : 'false');
            if (amountInput)   amountInput.setAttribute('aria-invalid',   result.errors.amount   ? 'true' : 'false');
            if (categoryInput) categoryInput.setAttribute('aria-invalid', result.errors.category ? 'true' : 'false');
            return;
          }

          // Clear any previous inline errors and aria-invalid states
          ui.clearInlineErrors();
          if (nameInput)     nameInput.setAttribute('aria-invalid',     'false');
          if (amountInput)   amountInput.setAttribute('aria-invalid',   'false');
          if (categoryInput) categoryInput.setAttribute('aria-invalid', 'false');

          // Generate a unique ID (UUID v4 preferred, fallback for older browsers)
          var id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
            ? crypto.randomUUID()
            : (Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));

          // Build the Transaction object
          var transaction = {
            id:        id,
            name:      name,
            amount:    Number(amount),
            category:  category,
            createdAt: new Date().toISOString(),
          };

          // Add to state (state.add handles persistence and calls renderAll)
          // Returns true on success, false if storage save failed.
          var added = state.add(transaction);

          // 8.1: Reset form fields within 200 ms — only on successful add
          if (added) {
            setTimeout(function () {
              if (nameInput)     nameInput.value     = '';
              if (amountInput)   amountInput.value   = '';
              if (categoryInput) categoryInput.value = '';
            }, 200);
          }
        });
      }

      // 8.2: delete delegation — single listener on the list container
      var list = document.getElementById('transaction-list');
      if (list) {
        list.addEventListener('click', function (e) {
          // Walk up from the click target to find the element carrying data-id
          var target = e.target.closest('[data-id]');
          if (!target) return;

          var id = target.getAttribute('data-id');
          if (id) {
            // state.remove handles persistence, rollback on failure, and renderAll
            state.remove(id);
          }
        });
      }
    }

    return { init: init };
  })();

  // 8.4: initialization block
  (function initApp() {
    // Feature-detect localStorage before anything else (Req 6.5, 5.4)
    if (!storage.available) {
      ui.showBanner('LocalStorage is unavailable; data will not persist');
    }

    // Wire up all event listeners
    events.init();

    // Hydrate from localStorage and trigger the first renderAll() (Req 5.1)
    state.load();
  })();

})();
