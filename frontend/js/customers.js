async function loadCustomersModule() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Customer Directory</h2>
            </div>
            
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; margin-top: 1rem;">
                <form id="addCustomerForm" class="grid-2">
                    <div class="form-group"><label>Name</label><input type="text" id="c_name" required></div>
                    <div class="form-group"><label>Phone</label><input type="text" id="c_phone" required></div>
                    <div class="form-group"><label>Email</label><input type="email" id="c_email"></div>
                    <div class="form-group"><label>Address</label><input type="text" id="c_address"></div>
                    <div style="grid-column: span 2;">
                        <button type="submit" class="btn btn-primary">Save Customer</button>
                    </div>
                </form>
            </div>

            <table id="customersTable" style="margin-top: 2rem;">
                <thead>
                    <tr><th>Name</th><th>Phone</th><th>Email</th><th>Address</th></tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    await fetchAndRenderCustomers();

    document.getElementById('addCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('c_name').value,
            phone: document.getElementById('c_phone').value,
            email: document.getElementById('c_email').value,
            address: document.getElementById('c_address').value
        };
        await api.request('/customers', { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('addCustomerForm').reset();
        await fetchAndRenderCustomers();
    });
}

async function fetchAndRenderCustomers() {
    const customers = await api.request('/customers');
    const tbody = document.querySelector('#customersTable tbody');
    tbody.innerHTML = customers.map(c => `
        <tr>
            <td><strong>${c.name}</strong></td>
            <td>${c.phone}</td>
            <td>${c.email || '-'}</td>
            <td>${c.address || '-'}</td>
        </tr>
    `).join('');
}