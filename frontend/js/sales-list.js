async function loadSalesListModule() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <div class="card">
            <h2>Recent Sales History</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">Showing the last 50 transactions.</p>
            
            <table id="salesTable">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Invoice ID</th>
                        <th>Subtotal</th>
                        <th>Discount</th>
                        <th>Grand Total</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    try {
        const orders = await api.request('/orders');
        const tbody = document.querySelector('#salesTable tbody');
        
        tbody.innerHTML = orders.map(o => `
            <tr>
                <td>${new Date(o.created_at).toLocaleString()}</td>
                <td><strong>${o.invoice_id}</strong></td>
                <td>৳${parseFloat(o.subtotal).toFixed(2)}</td>
                <td style="color: #ef4444;">৳${parseFloat(o.discount_amount).toFixed(2)}</td>
                <td><strong>৳${parseFloat(o.grand_total).toFixed(2)}</strong></td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Failed to load sales history.");
    }
}