async function loadAdminUsersSubmodule() {
    if (typeof loadAdminModule === 'function') {
        await loadAdminModule();
    }
}