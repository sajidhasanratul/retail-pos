const router = {
    routes: {
        '#dashboard': loadDashboardModule,
        '#products': loadProductModule,
        '#new-sale': loadNewOrderModule,
        '#sales-history': loadSalesListModule,
        '#returns-log': loadReturnListModule,
        '#customers': loadCustomersModule,
        '#roles-panel': loadAdminRolesModule,
        '#staff-panel': loadAdminUsersSubmodule
    },
    init() {
        window.addEventListener('hashchange', () => this.handleRouting());
        this.handleRouting();
    },
    handleRouting() {
        const hash = window.location.hash || '#dashboard';
        const routeAction = this.routes[hash];
        if (routeAction) {
            routeAction();
        } else {
            document.getElementById('app-content').innerHTML = '<h2>404</h2><p>Page not found.</p>';
        }
    }
};
