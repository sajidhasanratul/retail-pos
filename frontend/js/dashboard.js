async function loadDashboardModule() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <h2>POS Dashboard</h2>
        <div class="grid-2" style="margin-top: 1.5rem;">
            <div class="card" style="text-align: center; padding: 2rem;">
                <h3 style="color: #64748b; margin-bottom: 0.5rem;">Today's Sales</h3>
                <h1 style="color: #10b981; font-size: 2.5rem; margin: 0;" id="dashTodaySales">৳0.00</h1>
            </div>
            
            <div class="card" style="text-align: center; padding: 2rem;">
                <h3 style="color: #64748b; margin-bottom: 0.5rem;">Total Items in Stock</h3>
                <h1 style="color: #3b82f6; font-size: 2.5rem; margin: 0;" id="dashStock">0</h1>
            </div>
        </div>
    `;

    try {
        const stats = await api.request('/reports/summary');
        document.getElementById('dashTodaySales').innerText = `৳${parseFloat(stats.today_sales).toFixed(2)}`;
        document.getElementById('dashStock').innerText = stats.total_items_in_stock;
    } catch (e) {
        console.error('Failed to load dashboard stats');
    }
}