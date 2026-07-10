async function loadAdminRolesModule() {
    const content = document.getElementById('app-content');
    content.innerHTML = `
        <div class="card">
            <h2>Role-Based Management Engine</h2>
            <form id="createRoleForm" style="background: #f8fafc; padding: 1.5rem; border-radius: 8px;">
                <div class="form-group">
                    <label>Role Name</label>
                    <input type="text" id="roleName" placeholder="e.g., Senior Cashier" required>
                </div>
                <div class="form-group">
                    <label>Select Permissions</label>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
                        <label><input type="checkbox" value="products.create"> Create Products</label>
                        <label><input type="checkbox" value="sales.create"> Process Sales</label>
                        <label><input type="checkbox" value="sales.return"> Issue Refunds</label>
                        <label><input type="checkbox" value="reports.view"> View Reports</label>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary" style="margin-top: 1rem;">Save Custom Role</button>
            </form>
        </div>
    `;
    
    document.getElementById('createRoleForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const checkboxes = document.querySelectorAll('#createRoleForm input[type="checkbox"]:checked');
        const payload = {
            name: document.getElementById('roleName').value,
            permissions: Array.from(checkboxes).map(cb => cb.value)
        };
        await api.request('/roles', { method: 'POST', body: JSON.stringify(payload) });
        alert('Custom Role Created!');
        document.getElementById('createRoleForm').reset();
    });
}
