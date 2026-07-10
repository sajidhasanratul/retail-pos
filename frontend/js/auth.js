const auth = {
    login(token, user) {
        localStorage.setItem('pos_token', token);
        localStorage.setItem('pos_user', JSON.stringify(user));
        window.location.href = '/index.html';
    },
    logout() {
        localStorage.removeItem('pos_token');
        localStorage.removeItem('pos_user');
        window.location.href = '/login.html';
    },
    getUser() {
        return JSON.parse(localStorage.getItem('pos_user') || 'null');
    },
    hasPermission(key) {
        const user = this.getUser();
        return user && user.permissions ? user.permissions.includes(key) : false;
    },
    checkSession() {
        if (!localStorage.getItem('pos_token')) {
            window.location.href = '/login.html';
        }
    }
};