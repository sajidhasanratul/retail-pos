(function () {
  'use strict';

  const Expenses = {
    async render() {
      const mc = document.getElementById('main-content');
      const S = POS.Store;
      const H = POS.Helpers;

      const today = H.today();
      let fromDate = localStorage.getItem('exp_from') || today;
      let toDate = localStorage.getItem('exp_to') || today;

      mc.innerHTML = `
        <div class="page-header fade-in">
          <div>
            <h2 class="page-title">💸 Expenses Management</h2>
            <p class="page-subtitle">Add, track and manage shop expenses and operational costs.</p>
          </div>
          <div class="page-actions">
            <button class="btn btn-primary btn-sm" id="btn-add-expense">+ Add Expense</button>
          </div>
        </div>

        <div class="filter-bar fade-in">
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">From Date</label>
            <input type="date" class="form-input" id="exp-from" value="${fromDate}">
          </div>
          <div class="form-group" style="margin-bottom:0; flex: 1; min-width: 150px;">
            <label class="form-label">To Date</label>
            <input type="date" class="form-input" id="exp-to" value="${toDate}">
          </div>
          <button class="btn btn-primary" id="btn-filter-expenses" style="margin-top: 18px;">Apply Filter</button>
        </div>

        <div class="stats-grid fade-in mb-2" style="grid-template-columns: 1fr;">
          <div class="stat-card red" style="padding: 18px;">
            <div class="stat-icon">💸</div>
            <div class="stat-info">
              <div class="stat-label">Total Period Expenses</div>
              <div class="stat-value" id="stats-total-expenses">৳0.00</div>
              <div class="stat-sub" id="stats-expense-count">0 record(s)</div>
            </div>
          </div>
        </div>

        <div class="card fade-in">
          <div class="card-body">
            <div class="table-wrapper">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Expense Title</th>
                    <th>Amount</th>
                    <th>Note / Details</th>
                    <th style="width: 100px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="expenses-tbody">
                  <tr>
                    <td colspan="5" class="text-center text-muted">Loading expenses...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-add-expense').onclick = () => this.showAddModal();
      document.getElementById('btn-filter-expenses').onclick = async () => {
        fromDate = document.getElementById('exp-from').value;
        toDate = document.getElementById('exp-to').value;
        localStorage.setItem('exp_from', fromDate);
        localStorage.setItem('exp_to', toDate);
        await this.updateList(fromDate, toDate);
      };

      await this.updateList(fromDate, toDate);
    },

    async updateList(from, to) {
      const S = POS.Store;
      const H = POS.Helpers;
      const tbody = document.getElementById('expenses-tbody');
      const totalEl = document.getElementById('stats-total-expenses');
      const countEl = document.getElementById('stats-expense-count');
      const user = S.getCurrentUser();

      const list = await S.query('expenses', e => H.isDateInRange(e.date, from, to));

      tbody.innerHTML = '';
      let sumAmount = 0;

      if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No expenses recorded for this period.</td></tr>`;
        totalEl.textContent = H.formatCurrency(0);
        countEl.textContent = `0 record(s)`;
        return;
      }

      list.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        sumAmount += amt;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td style="font-weight:600;">${H.formatDateTime(e.date)}</td>
          <td style="font-weight:600; color:var(--text-dark);">${H.esc(e.name)}</td>
          <td style="font-weight:700; color:var(--danger);">${H.formatCurrency(amt)}</td>
          <td style="color:#64748b; font-size:12px;">${H.esc(e.note || 'N/A')}</td>
          <td class="text-center">
            ${user && (user.role === 'admin' || user.role === 'manager') ? `
              <button class="btn btn-danger btn-xs btn-delete-expense" data-id="${H.esc(e.id)}">🗑️ Delete</button>
            ` : '<span class="text-muted" style="font-size:11px;">Restricted</span>'}
          </td>
        `;

        tbody.appendChild(row);

        const delBtn = row.querySelector('.btn-delete-expense');
        if (delBtn) {
          delBtn.onclick = async () => {
            if (await H.confirm(`Are you sure you want to delete the expense "${e.name}" of ${H.formatCurrency(amt)}?`)) {
              const ok = await S.delete('expenses', e.id);
              if (ok) {
                H.showToast('Expense record deleted');
                await this.updateList(from, to);
              }
            }
          };
        }
      });

      totalEl.textContent = H.formatCurrency(sumAmount);
      countEl.textContent = `${list.length} record(s)`;
    },

    showAddModal() {
      const S = POS.Store;
      const H = POS.Helpers;
      const modalOverlay = document.getElementById('global-modal-overlay');
      if (!modalOverlay) return;

      // Construct default datetime-local string matching local timezone
      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localNow = new Date(now.getTime() - offset * 60 * 1000);
      const defaultDateTime = localNow.toISOString().slice(0, 16);

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 400px;">
          <div class="modal-header">
            <h3>💸 Add Expense</h3>
            <button class="modal-close" id="modal-close-expense">&times;</button>
          </div>
          <div class="modal-body">
            <div class="form-group mb-2">
              <label class="form-label">Expense Title / Name</label>
              <input type="text" class="form-input" id="exp-name" placeholder="e.g. Electric Bill, Rent" required>
            </div>
            <div class="form-group mb-2">
              <label class="form-label">Date & Time</label>
              <input type="datetime-local" class="form-input" id="exp-datetime" value="${defaultDateTime}" required>
            </div>
            <div class="form-group mb-2">
              <label class="form-label">Amount (৳)</label>
              <input type="number" class="form-input" id="exp-amount" placeholder="৳ Amount" min="0" required>
            </div>
            <div class="form-group">
              <label class="form-label">Note / Description</label>
              <textarea class="form-input" id="exp-note" placeholder="Optional details..." rows="3" style="resize:vertical;"></textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" id="btn-expense-cancel">Cancel</button>
            <button class="btn btn-primary" id="btn-expense-save">Save Expense</button>
          </div>
        </div>
      `;

      modalOverlay.classList.add('active');

      const close = () => modalOverlay.classList.remove('active');
      modalOverlay.querySelector('#modal-close-expense').onclick = close;
      modalOverlay.querySelector('#btn-expense-cancel').onclick = close;

      modalOverlay.querySelector('#btn-expense-save').onclick = async () => {
        const name = document.getElementById('exp-name').value.trim();
        const dateInput = document.getElementById('exp-datetime').value;
        const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
        const note = document.getElementById('exp-note').value.trim();

        if (!name || !dateInput || amount <= 0) {
          H.showToast('Please fill out all fields with valid values.', 'error');
          return;
        }

        const date = new Date(dateInput).toISOString();

        const res = await S.add('expenses', {
          id: 'exp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          name,
          date,
          amount,
          note
        });

        if (res) {
          H.showToast('Expense recorded successfully!');
          close();
          const from = document.getElementById('exp-from').value;
          const to = document.getElementById('exp-to').value;
          await this.updateList(from, to);
        }
      };
    }
  };

  window.POS = window.POS || {};
  window.POS.Expenses = Expenses;
})();
