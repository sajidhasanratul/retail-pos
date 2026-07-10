async function loadAdminModule() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <div class="card">
            <h2>Staff Management</h2>
            <p style="color: #64748b; margin-bottom: 1.5rem;">Create accounts for your cashiers and managers.</p>
            
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 2rem;">
                <form id="addUserForm" class="grid-2">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" id="u_name" required>
                    </div>
                    <div class="form-group">
                        <label>Email Address</label>
                        <input type="email" id="u_email" required>
                    </div>
                    <div class="form-group">
                        <label>Password</label>
                        <input type="password" id="u_pass" required minlength="6">
                    </div>
                    <div class="form-group">
                        <label>Assign Role</label>
                        <select id="u_role" required>
                            <option value="">Loading roles...</option>
                        </select>
                    </div>
                    <div style="grid-column: span 2;">
                        <button type="submit" class="btn btn-primary" style="width: 100%;">Create Account</button>
                    </div>
                </form>
            </div>

            <table id="usersTable">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    // 1. Fetch and populate roles dropdown
    try {
        const roles = await api.request('/users/roles');
        const roleSelect = document.getElementById('u_role');
        roleSelect.innerHTML = roles.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
    } catch (e) {
        console.error("Failed to load roles.");
    }

    // 2. Fetch and display users table
    await fetchAndRenderUsers();

    // 3. Handle Form Submission
    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            name: document.getElementById('u_name').value,
            email: document.getElementById('u_email').value,
            password: document.getElementById('u_pass').value,
            role_id: document.getElementById('u_role').value
        };

        try {
            await api.request('/users', { method: 'POST', body: JSON.stringify(payload) });
            alert('Staff member created successfully!');
            document.getElementById('addUserForm').reset();
            await fetchAndRenderUsers();
        } catch (err) {
            // Error handled by api.js
        }
    });
}

async function fetchAndRenderUsers() {
    try {
        const users = await api.request('/users');
        const tbody = document.querySelector('#usersTable tbody');
        
        tbody.innerHTML = users.map(u => `
            <tr>
                <td><strong>${u.name}</strong></td>
                <td>${u.email}</td>
                <td><span style="background: #e0e7ff; color: #3730a3; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">${u.role_name}</span></td>
                <td>
                    <span style="color: ${u.is_active ? '#16a34a' : '#dc2626'}; font-weight: 500;">
                        ${u.is_active ? 'Active' : 'Disabled'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        console.error("Failed to load users table.");
    }
}