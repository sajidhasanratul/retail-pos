let currentCart = [];

async function loadNewOrderModule() {
    const content = document.getElementById('app-content');
    
    content.innerHTML = `
        <div class="grid-2" style="grid-template-columns: 2fr 1fr; gap: 1.5rem; height: calc(100vh - 100px);">
            
            <div class="card" style="display: flex; flex-direction: column; height: 100%;">
                <h2>New Sale</h2>
                <div class="form-group" style="position: relative;">
                    <input type="text" id="productSearch" placeholder="Search by Name, SKU, or Barcode..." autocomplete="off">
                    <div id="searchResults" style="position: absolute; width: 100%; background: white; border: 1px solid #ddd; z-index: 10; display: none; max-height: 200px; overflow-y: auto; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"></div>
                </div>
                
                <div style="flex: 1; overflow-y: auto; border: 1px solid #e5e7eb; border-radius: 6px;">
                    <table id="cartTable">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Price</th>
                                <th>Qty</th>
                                <th>Total</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <div class="card" style="display: flex; flex-direction: column; height: 100%; background: #f8fafc;">
                <h3>Order Summary</h3>
                
                <div style="display: flex; justify-content: space-between; margin-top: 1rem;">
                    <span>Subtotal</span>
                    <strong id="summarySubtotal">৳0.00</strong>
                </div>
                
                <div class="form-group" style="margin-top: 1rem;">
                    <label>Discount (৳)</label>
                    <input type="number" id="orderDiscount" value="0" min="0" step="1">
                </div>
                <div class="form-group">
                    <label>Tax / VAT (৳)</label>
                    <input type="number" id="orderTax" value="0" min="0" step="1">
                </div>
                
                <hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 1rem 0;">
                
                <div style="display: flex; justify-content: space-between; font-size: 1.25rem; color: #1e1b4b;">
                    <strong>Grand Total</strong>
                    <strong id="summaryTotal">৳0.00</strong>
                </div>

                <div class="form-group" style="margin-top: auto;">
                    <label>Payment Method</label>
                    <select id="paymentMethod">
                        <option value="Cash">Cash</option>
                        <option value="Card">Card</option>
                        <option value="bKash">bKash</option>
                        <option value="Nagad">Nagad</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                </div>
                
                <button class="btn btn-primary" id="btnCheckout" style="font-size: 1.1rem; padding: 1rem;">Complete Sale</button>
            </div>
        </div>
    `;

    // Event Listeners for Cart Math
    document.getElementById('orderDiscount').addEventListener('input', updateCartTotals);
    document.getElementById('orderTax').addEventListener('input', updateCartTotals);
    
    // Product Search Logic
    const searchInput = document.getElementById('productSearch');
    const searchResults = document.getElementById('searchResults');
    
    searchInput.addEventListener('input', async (e) => {
        const query = e.target.value.trim();
        if (query.length < 2) {
            searchResults.style.display = 'none';
            return;
        }
        
        const products = await api.request(`/orders/search-products?q=${query}`);
        searchResults.innerHTML = '';
        
        if (products.length > 0) {
            products.forEach(p => {
                const div = document.createElement('div');
                div.style.padding = '10px';
                div.style.cursor = 'pointer';
                div.style.borderBottom = '1px solid #f1f5f9';
                div.innerHTML = `<strong>${p.name}</strong> - ৳${p.selling_price} (Stock: ${p.stock_qty})`;
                div.onclick = () => addToCart(p);
                searchResults.appendChild(div);
            });
            searchResults.style.display = 'block';
        } else {
            searchResults.innerHTML = '<div style="padding:10px; color:gray;">No products found in stock</div>';
            searchResults.style.display = 'block';
        }
    });

    // Hide search results when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target !== searchInput) searchResults.style.display = 'none';
    });

    // Checkout Logic
    document.getElementById('btnCheckout').addEventListener('click', processCheckout);
}

function addToCart(product) {
    const existing = currentCart.find(item => item.id === product.id);
    if (existing) {
        if (existing.qty < product.stock_qty) {
            existing.qty += 1;
        } else {
            alert('Cannot add more than available stock!');
        }
    } else {
        currentCart.push({
            id: product.id,
            name: product.name,
            price: parseFloat(product.selling_price),
            qty: 1,
            max_stock: product.stock_qty
        });
    }
    document.getElementById('productSearch').value = '';
    renderCart();
}

function removeFromCart(index) {
    currentCart.splice(index, 1);
    renderCart();
}

function changeQty(index, newQty) {
    const val = parseInt(newQty);
    if (val > 0 && val <= currentCart[index].max_stock) {
        currentCart[index].qty = val;
        renderCart();
    } else {
        renderCart(); // Reset to valid number visually
    }
}

function renderCart() {
    const tbody = document.querySelector('#cartTable tbody');
    tbody.innerHTML = '';
    
    currentCart.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>৳${item.price.toFixed(2)}</td>
            <td>
                <input type="number" value="${item.qty}" min="1" max="${item.max_stock}" 
                       style="width:60px;" onchange="changeQty(${index}, this.value)">
            </td>
            <td>৳${(item.price * item.qty).toFixed(2)}</td>
            <td><button class="btn btn-danger btn-sm" onclick="removeFromCart(${index})">X</button></td>
        `;
        tbody.appendChild(tr);
    });
    
    updateCartTotals();
}

function updateCartTotals() {
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discount = parseFloat(document.getElementById('orderDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('orderTax').value) || 0;
    
    const grandTotal = (subtotal - discount) + tax;
    
    document.getElementById('summarySubtotal').innerText = `৳${subtotal.toFixed(2)}`;
    document.getElementById('summaryTotal').innerText = `৳${Math.max(0, grandTotal).toFixed(2)}`;
}

async function processCheckout() {
    if (currentCart.length === 0) return alert('Cart is empty!');
    
    const subtotal = currentCart.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const discount = parseFloat(document.getElementById('orderDiscount').value) || 0;
    const tax = parseFloat(document.getElementById('orderTax').value) || 0;
    const grandTotal = Math.max(0, (subtotal - discount) + tax);
    const paymentMethod = document.getElementById('paymentMethod').value;
    
    const payload = {
        customer_id: null, // Can add customer selection later
        cart: currentCart,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        grand_total: grandTotal,
        payment_method: paymentMethod,
        amount_paid: grandTotal
    };

    try {
        document.getElementById('btnCheckout').disabled = true;
        const res = await api.request('/orders', { method: 'POST', body: JSON.stringify(payload) });
        alert(`Success! Invoice: ${res.invoice_id}`);
        
        // Reset Cart
        currentCart = [];
        document.getElementById('orderDiscount').value = '0';
        document.getElementById('orderTax').value = '0';
        renderCart();
    } catch (err) {
        // Error already handled by api.js alert
    } finally {
        document.getElementById('btnCheckout').disabled = false;
    }
}