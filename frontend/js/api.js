const api = {
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('pos_token');
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(`/api${endpoint}`, { ...options, headers });
            const data = await response.json();

            // Auto-logout if token expires
            if (response.status === 401) {
                localStorage.removeItem('pos_token');
                window.location.href = '/login.html';
                return null;
            }

            if (!response.ok) throw new Error(data.message || 'API Error');
            return data;
        } catch (error) {
            console.error('API Request Failed:', error);
            alert(error.message);
            throw error;
        }
    }
};