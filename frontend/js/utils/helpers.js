const helpers = {
    formatCurrency(amount) {
        return `৳${parseFloat(amount || 0).toFixed(2)}`;
    },
    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};