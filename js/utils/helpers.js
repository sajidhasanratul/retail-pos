(function () {
  'use strict';

  const Helpers = {
    /* ── Currency ──────────────────────────────────── */
    formatCurrency(amount) {
      const n = parseFloat(amount) || 0;
      return '৳' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    rawNumber(amount) {
      return parseFloat(amount) || 0;
    },

    /* ── Dates ─────────────────────────────────────── */
    formatDate(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    },

    formatDateTime(dateStr) {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    },

    formatDateInput(dateStr) {
      const d = new Date(dateStr || Date.now());
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    },

    today() {
      return this.formatDateInput(new Date());
    },

    isDateInRange(dateStr, from, to) {
      if (!dateStr) return false;
      const d = new Date(dateStr).setHours(0, 0, 0, 0);
      if (from && d < new Date(from).setHours(0, 0, 0, 0)) return false;
      if (to && d > new Date(to).setHours(23, 59, 59, 999)) return false;
      return true;
    },

    /* ── CSV Export ────────────────────────────────── */
    exportCSV(data, filename) {
      if (!data || !data.length) return;
      const headers = Object.keys(data[0]);
      const rows = data.map(row =>
        headers.map(h => {
          let val = row[h] ?? '';
          val = String(val).replace(/"/g, '""');
          return `"${val}"`;
        }).join(',')
      );
      const csv = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = (filename || 'export') + '.csv';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    parseCSV(text) {
      if (!text) return [];
      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length === 0) return [];

      const parseLine = (line) => {
        const result = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              cur += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headers = parseLine(lines[0]);
      const list = [];
      for (let i = 1; i < lines.length; i++) {
        const values = parseLine(lines[i]);
        if (values.length < headers.length) continue;
        const obj = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] ?? '';
        });
        list.push(obj);
      }
      return list;
    },

    /* ── Print ─────────────────────────────────────── */
    printHTML(html, title) {
      const w = window.open('', '_blank', 'width=800,height=600');
      w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
        <title>${title || 'Print'}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Libre+Barcode+39&display=swap" rel="stylesheet">
        <style>
          *{margin:0;padding:0;box-sizing:border-box}
          body{font-family:'Inter',sans-serif;padding:30px;color:#1e293b;font-size:13px}
          table{width:100%;border-collapse:collapse;margin:12px 0}
          th,td{border:1px solid #cbd5e1;padding:8px 10px;text-align:left}
          th{background:#f1f5f9;font-weight:600}
          .text-right{text-align:right} .text-center{text-align:center}
          h1{font-size:20px;margin-bottom:4px} h2{font-size:16px;margin:16px 0 8px}
          .invoice-header{display:flex;justify-content:space-between;margin-bottom:20px}
          .totals{margin-top:12px;text-align:right} .totals .grand{font-size:18px;font-weight:700}
          
          /* Thermal Receipt Printer CSS */
          /* Thermal Receipt Printer CSS */
          .thermal-receipt {
            max-width: 80mm;
            margin: 0 auto;
            color: #000;
            font-family: 'Inter', sans-serif;
            font-size: 12px;
          }
          .thermal-receipt table {
            border: none;
            width: 100%;
            border-collapse: collapse;
          }
          
          /* Style 1: Standard Minimalist (Default) */
          .thermal-receipt.style-1 th, .thermal-receipt.style-1 td {
            border: none;
            border-bottom: 1px dashed #ccc;
            padding: 5px 2px;
            font-size: 11px;
            background: none !important;
          }
          .thermal-receipt.style-1 th {
            border-bottom: 2px dashed #000;
            font-weight: 700;
            text-transform: uppercase;
          }
          .thermal-receipt.style-1 hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 10px 0;
          }
          .thermal-receipt.style-1 .totals {
            margin-top: 10px;
            border-top: 2px dashed #000;
            padding-top: 8px;
            text-align: right;
          }
          
          /* Style 2: Classic Bordered (Compact) */
          .thermal-receipt.style-2 {
            border: 2px solid #000;
            padding: 8px;
          }
          .thermal-receipt.style-2 th, .thermal-receipt.style-2 td {
            border: 1px solid #000;
            padding: 5px;
            font-size: 11px;
            background: none !important;
          }
          .thermal-receipt.style-2 th {
            font-weight: 700;
            background: #f1f5f9 !important;
          }
          .thermal-receipt.style-2 hr {
            border: none;
            border-top: 1px solid #000;
            margin: 8px 0;
          }
          .thermal-receipt.style-2 .totals {
            margin-top: 8px;
            border-top: 1px solid #000;
            padding-top: 6px;
            text-align: right;
          }

          /* Style 3: Modern Elegant (Centered Header) */
          .thermal-receipt.style-3 {
            text-align: center;
          }
          .thermal-receipt.style-3 table {
            text-align: center;
          }
          .thermal-receipt.style-3 th, .thermal-receipt.style-3 td {
            border: none;
            border-bottom: 1px solid #ddd;
            padding: 6px 3px;
            font-size: 11px;
            text-align: center;
          }
          .thermal-receipt.style-3 th:first-child, .thermal-receipt.style-3 td:first-child {
            text-align: left;
          }
          .thermal-receipt.style-3 th:last-child, .thermal-receipt.style-3 td:last-child {
            text-align: right;
          }
          .thermal-receipt.style-3 th {
            border-bottom: 2px solid #000;
            font-weight: 700;
          }
          .thermal-receipt.style-3 hr {
            border: none;
            border-top: 2px double #000;
            margin: 10px 0;
          }
          .thermal-receipt.style-3 .totals {
            margin-top: 10px;
            border-top: 2px double #000;
            padding-top: 8px;
            text-align: right;
          }
          
          .thermal-receipt .totals p {
            margin: 3px 0;
          }
          
          /* Product Label Printer CSS */
          .product-label {
            width: 50mm;
            height: 30mm;
            padding: 3mm;
            border: 1px dashed #94a3b8;
            margin: 0 auto;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            font-family: 'Inter', sans-serif;
            color: #000;
          }
          .label-title {
            font-size: 10px;
            font-weight: 800;
            margin-bottom: 2px;
            overflow: hidden;
            white-space: nowrap;
            text-overflow: ellipsis;
          }
          .label-price {
            font-size: 11px;
            font-weight: 800;
            margin: 1px 0;
          }
          .label-barcode {
            margin: 2px auto;
            font-family: 'Libre Barcode 39', monospace;
            font-size: 24px;
            letter-spacing: 2px;
          }
          .label-sku {
            font-size: 8px;
            color: #334155;
            font-weight: 600;
          }
          
          @media print {
            body { padding: 0 !important; }
            .product-label { border: none !important; }
          }
        </style></head><body>${html}</body></html>`);
      w.document.close();
      setTimeout(() => { w.print(); }, 400);
    },

    /* ── Toast Notification ────────────────────────── */
    showToast(message, type) {
      type = type || 'success';
      const icons = { success: '✓', error: '✗', info: 'ⓘ', warning: '⚠' };
      const toast = document.createElement('div');
      toast.className = 'toast toast-' + type;
      toast.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ⓘ') + '</span><span>' + message + '</span>';
      document.body.appendChild(toast);
      requestAnimationFrame(() => toast.classList.add('show'));
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      }, 3000);
    },

    /* ── Confirm Dialog ────────────────────────────── */
    confirm(message) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay active';
        overlay.innerHTML = `
          <div class="modal" style="max-width:420px">
            <div class="modal-header"><h3>Confirm Action</h3>
              <button class="modal-close" id="confirm-close">&times;</button></div>
            <div class="modal-body"><p style="font-size:15px">${message}</p></div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="confirm-no">Cancel</button>
              <button class="btn btn-danger" id="confirm-yes">Confirm</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const close = (val) => { overlay.remove(); resolve(val); };
        overlay.querySelector('#confirm-yes').onclick = () => close(true);
        overlay.querySelector('#confirm-no').onclick = () => close(false);
        overlay.querySelector('#confirm-close').onclick = () => close(false);
      });
    },

    /* ── Debounce ──────────────────────────────────── */
    debounce(fn, ms) {
      let t; return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), ms || 300); };
    },

    /* ── Escape HTML ──────────────────────────────── */
    esc(str) {
      const d = document.createElement('div');
      d.textContent = str || '';
      return d.innerHTML;
    },

    /* ── Payment methods ──────────────────────────── */
    paymentMethods: ['Cash', 'Card', 'bKash', 'Nagad', 'Rocket', 'Bank Transfer', 'Other'],

    /* ── Customer labels ──────────────────────────── */
    customerLabels: ['Regular', 'VIP', 'Elite', 'Wholesale', 'Premium', 'New'],

    labelColors: {
      Regular: '#64748b', VIP: '#7c3aed', Elite: '#d97706',
      Wholesale: '#059669', Premium: '#2563eb', New: '#06b6d4'
    }
  };

  window.POS = window.POS || {};
  window.POS.Helpers = Helpers;
})();
