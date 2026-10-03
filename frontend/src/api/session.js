export const getCurrentUser = () => {
  try {
    const session = JSON.parse(localStorage.getItem('hris_session') || 'null');
    return session?.user || JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

export const hasManagementAccess = (user) => ['HRD', 'Manager'].includes(user?.role);