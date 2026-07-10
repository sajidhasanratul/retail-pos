async function loadReturnListModule() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="card">
            <h2>Sales Returns Log</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">History of customer refunds and inventory adjustments.</p>
            <table id="returnsTable">
                <thead>
                    <tr><th>Date</th><th>Order ID</th><th>Refund Amount</th><th>Reason</th></tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;
    try {
        const data = await api.request('/returns');
        const tbody = document.querySelector('#returnsTable tbody');
        tbody.innerHTML = data.map(r => `
            <tr>
                <td>${new Date(r.created_at).toLocaleString()}</td>
                <td><strong>Order #${r.order_id}</strong></td>
                <td style="color: #ef4444; font-weight: bold;">৳${parseFloat(r.refund_amount).toFixed(2)}</td>
                <td>${r.reason || 'No reason provided'}</td>
            </tr>
        `).join('');
    } catch (e) {
        console.error(e);
    }
}