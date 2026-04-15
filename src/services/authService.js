// Simple authentication and role management service
// In production, this should be replaced with proper JWT-based authentication

class AuthService {
  constructor() {
    this.USER_KEY = 'currentUser';
    this.ROLE_KEY = 'userRole';
  }

  // Set current user and role
  setUser(user) {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    localStorage.setItem(this.ROLE_KEY, user.role);
  }

  // Get current user
  getUser() {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  // Get current role
  getRole() {
    return localStorage.getItem(this.ROLE_KEY) || 'faculty';
  }

  // Check if user is faculty
  isFaculty() {
    return this.getRole() === 'faculty';
  }

  // Check if user is Dofa
  isDofa() {
    return this.getRole() === 'Dofa';
  }

  // Check if user is Dofa Office
  isDofaOffice() {
    return this.getRole() === 'Dofa_office';
  }

  // Get dashboard route based on role
  getDashboardRoute() {
    const role = this.getRole();
    switch (role) {
      case 'faculty':
        return '/';
      case 'Dofa':
        return '/Dofa/dashboard';
      case 'Dofa_office':
        return '/Dofa-office/dashboard';
      default:
        return '/';
    }
  }

  // Logout
  logout() {
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.ROLE_KEY);
  }

  // Mock login (for development)
  mockLogin(role = 'faculty', userId = 1) {
    const mockUsers = {
      faculty: {
        id: 1,
        name: 'Dr. Test Faculty',
        email: 'test.faculty@university.edu',
        role: 'faculty',
        department: 'Computer Science'
      },
      Dofa: {
        id: 2,
        name: 'Dofa Admin',
        email: 'Dofa@university.edu',
        role: 'Dofa',
        department: 'Administration'
      },
      Dofa_office: {
        id: 3,
        name: 'Dofa Office Admin',
        email: 'Dofa.office@university.edu',
        role: 'Dofa_office',
        department: 'Administration'
      }
    };

    const user = mockUsers[role];
    if (user) {
      this.setUser(user);
      return user;
    }
    return null;
  }
}

export default new AuthService();

