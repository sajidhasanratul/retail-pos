const permissions = {
    applyUIElements() {
        const user = auth.getUser();
        if (!user) return;

        // Map navigation item IDs to required permissions
        const navMappings = {
            'nav-dashboard': 'reports.view',
            'nav-products': 'products.view',
            'nav-sales-new': 'sales.create',
            'nav-sales-list': 'sales.view',
            'nav-customers': 'customers.manage',
            'nav-admin': 'users.manage'
        };

        Object.keys(navMappings).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (!user.permissions.includes(navMappings[id])) {
                    el.style.display = 'none';
                } else {
                    el.style.display = 'flex';
                }
            }
        });
    }
};