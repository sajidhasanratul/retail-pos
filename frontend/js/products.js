async function loadProductModule() {
    const content = document.getElementById('app-content');
    
    // Inject HTML for the Products view
    content.innerHTML = `
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>Product Inventory</h2>
                <button class="btn btn-primary" onclick="showAddProductForm()" id="btnAddProduct">
                    + Add New Product
                </button>
            </div>
            
            <div id="productFormContainer" style="display:none; margin-top: 1rem; padding: 1rem; background: #f9fafb; border-radius: 8px;">
                <form id="addProductForm" class="grid-2">
                    <div class="form-group"><label>Product Name</label><input type="text" id="p_name" required></div>
                    <div class="form-group"><label>SKU / Barcode</label><input type="text" id="p_sku" required></div>
                    <div class="form-group"><label>Cost Price (৳)</label><input type="number" id="p_cost" step="0.01" required></div>
                    <div class="form-group"><label>Selling Price (৳)</label><input type="number" id="p_sell" step="0.01" required></div>
                    <div class="form-group"><label>Initial Stock</label><input type="number" id="p_stock" required></div>
                    <div class="form-group" style="display:flex; align-items:flex-end;">
                        <button type="submit" class="btn btn-primary" style="width:100%;">Save Product</button>
                    </div>
                </form>
            </div>

            <table id="productsTable">
                <thead>
                    <tr>
                        <th>SKU</th>
                        <th>Name</th>
                        <th>Cost Price</th>
                        <th>Selling Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>
        </div>
    `;

    // Apply RBAC to the "Add" button visually
    const user = JSON.parse(localStorage.getItem('pos_user') || '{}');
    if (!user.permissions.includes('products.create')) {
        document.getElementById('btnAddProduct').style.display = 'none';
    }

    // Fetch and display data
    await fetchAndRenderProducts();

    // Handle Form Submit
    document.getElementById('addProductForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            name: document.getElementById('p_name').value,
            sku: document.getElementById('p_sku').value,
            cost_price: document.getElementById('p_cost').value,
            selling_price: document.getElementById('p_sell').value,
            stock_qty: document.getElementById('p_stock').value
        };

        await api.request('/products', { method: 'POST', body: JSON.stringify(payload) });
        document.getElementById('productFormContainer').style.display = 'none';
        document.getElementById('addProductForm').reset();
        await fetchAndRenderProducts();
    });
}

function showAddProductForm() {
    const form = document.getElementById('productFormContainer');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
}

async function fetchAndRenderProducts() {
    const products = await api.request('/products');
    const tbody = document.querySelector('#productsTable tbody');
    tbody.innerHTML = '';

    products.forEach(p => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${p.sku}</td>
            <td>${p.name}</td>
            <td>৳${parseFloat(p.cost_price).toFixed(2)}</td>
            <td>৳${parseFloat(p.selling_price).toFixed(2)}</td>
            <td>
                <span style="color: ${p.stock_qty <= p.low_stock_alert ? 'red' : 'green'}; font-weight:bold;">
                    ${p.stock_qty}
                </span>
            </td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function deleteProduct(id) {
    if(confirm('Are you sure you want to delete this product?')) {
        await api.request(`/products/${id}`, { method: 'DELETE' });
        await fetchAndRenderProducts();
    }
}