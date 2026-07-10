async function loadReportsModule() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="card">
            <h2>Detailed Financial Reports</h2>
            <div class="grid-2" style="margin-top: 1.5rem;">
                <div class="card" style="background:#f0fdf4;">
                    <h3>Gross Earnings Summary</h3>
                    <p>Live metrics compiled from all completed historical invoices.</p>
                </div>
                <div class="card" style="background:#f0f9ff;">
                    <h3>Stock Appraisals</h3>
                    <p>Calculates inventory net asset valuation totals dynamically.</p>
                </div>
            </div>
        </div>
    `;
}