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
            <p class="page-subtitle">Track operation fees, rent, payrolls, and print details.</p>
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
                    <th style="width: 60px; text-align: center;">Image</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th style="width: 100px; text-align: center;">Actions</th>
                  </tr>
                </thead>
                <tbody id="expenses-tbody">
                  <tr>
                    <td colspan="7" class="text-center text-muted">Loading expenses...</td>
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No expenses recorded for this period.</td></tr>`;
        totalEl.textContent = H.formatCurrency(0);
        countEl.textContent = `0 record(s)`;
        return;
      }

      const catColors = {
        Utilities: 'background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe;',
        Salaries: 'background: #faf5ff; color: #6b21a8; border: 1px solid #e9d5ff;',
        Rent: 'background: #fdf2f8; color: #9d174d; border: 1px solid #fbcfe8;',
        Inventory: 'background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0;',
        Marketing: 'background: #ecfeff; color: #075985; border: 1px solid #cffafe;',
        Maintenance: 'background: #fffbeb; color: #92400e; border: 1px solid #fef3c7;',
        Other: 'background: #f8fafc; color: #334155; border: 1px solid #e2e8f0;'
      };

      list.forEach(e => {
        const amt = parseFloat(e.amount) || 0;
        sumAmount += amt;

        const imgHtml = e.image 
          ? `<img src="${e.image}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border: 1px solid var(--border);" alt="${H.esc(e.name)}">`
          : `<div style="width:36px; height:36px; border-radius:6px; background:var(--bg); border: 1px dashed var(--border); display:flex; align-items:center; justify-content:center; font-size:16px;">💸</div>`;

        const catStyle = catColors[e.category] || catColors['Other'];
        const statusBadge = e.status === 'Paid'
          ? `<span class="badge badge-success">Paid</span>`
          : `<span class="badge badge-warning">Pending</span>`;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td class="text-center">${imgHtml}</td>
          <td style="font-weight:700; color:var(--text-dark);">${H.esc(e.name)}</td>
          <td><span class="badge" style="${catStyle} font-weight:600;">${H.esc(e.category || 'Other')}</span></td>
          <td style="font-weight:700; color:var(--danger);">${H.formatCurrency(amt)}</td>
          <td>${H.formatDateTime(e.date)}</td>
          <td>${statusBadge}</td>
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

      const now = new Date();
      const offset = now.getTimezoneOffset();
      const localNow = new Date(now.getTime() - offset * 60 * 1000);
      const defaultDateTime = localNow.toISOString().slice(0, 16);

      let imageBase64 = '';

      modalOverlay.innerHTML = `
        <div class="modal animate" style="max-width: 450px;">
          <div class="modal-header">
            <h3>💸 Add New Expense</h3>
            <button class="modal-close" id="modal-close-expense">&times;</button>
          </div>
          <div class="modal-body" style="max-height: 480px; overflow-y: auto; padding-right: 6px;">
            <div class="form-group mb-2">
              <label class="form-label">Expense Title / Name</label>
              <input type="text" class="form-input" id="exp-name" placeholder="e.g. Electric Bill, Rent" required>
            </div>
            
            <div class="form-group mb-2">
              <label class="form-label">Category</label>
              <select class="form-select" id="exp-category">
                <option value="Utilities">Utilities (Electricity, Water, Internet)</option>
                <option value="Rent">Shop Rent</option>
                <option value="Salaries">Staff Salaries</option>
                <option value="Inventory">Inventory Purchase</option>
                <option value="Marketing">Marketing / Advertising</option>
                <option value="Maintenance">Shop Maintenance</option>
                <option value="Other" selected>Other / Miscellaneous</option>
              </select>
            </div>

            <div class="grid-2 gap-2 mb-2" style="grid-template-columns: 1fr 1fr;">
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Amount (৳)</label>
                <input type="number" class="form-input" id="exp-amount" placeholder="৳ Amount" min="0.01" step="0.01" required>
              </div>
              <div class="form-group" style="margin-bottom:0;">
                <label class="form-label">Status</label>
                <select class="form-select" id="exp-status">
                  <option value="Paid" selected>Paid</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Date & Time</label>
              <input type="datetime-local" class="form-input" id="exp-datetime" value="${defaultDateTime}" required>
            </div>

            <div class="form-group mb-2">
              <label class="form-label">Receipt Image</label>
              <div style="display:flex; flex-direction:column; gap:8px;">
                <input type="file" class="form-input" id="exp-image-file" accept="image/*">
                <img id="exp-image-preview" style="display:none; width:100%; max-height:120px; border-radius:6px; object-fit:contain; border:1px dashed var(--border); background:#fafafa;">
              </div>
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

      const fileInput = modalOverlay.querySelector('#exp-image-file');
      const imgPreview = modalOverlay.querySelector('#exp-image-preview');

      fileInput.onchange = (ev) => {
        const file = ev.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (re) => {
            imageBase64 = re.target.result;
            imgPreview.src = imageBase64;
            imgPreview.style.display = 'block';
          };
          reader.readAsDataURL(file);
        }
      };

      modalOverlay.querySelector('#btn-expense-save').onclick = async () => {
        const name = document.getElementById('exp-name').value.trim();
        const category = document.getElementById('exp-category').value;
        const amount = parseFloat(document.getElementById('exp-amount').value) || 0;
        const status = document.getElementById('exp-status').value;
        const dateInput = document.getElementById('exp-datetime').value;
        const note = document.getElementById('exp-note').value.trim();

        if (!name || amount <= 0) {
          H.showToast('Please enter a valid expense title and amount.', 'error');
          return;
        }

        let date = '';
        try {
          date = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
        } catch (e) {
          date = new Date().toISOString();
        }

        const res = await S.add('expenses', {
          id: 'exp_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
          name,
          category,
          amount,
          date,
          status,
          image: imageBase64,
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
