import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Do not force navigation on auth endpoints (login/register/refresh)
      const reqUrl = error.config?.url || '';
      const isAuthEndpoint = reqUrl.includes('/auth/login') || reqUrl.includes('/auth/register') || reqUrl.includes('/auth/refresh-token');
      if (!isAuthEndpoint) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// =============== AUTH ENDPOINTS ===============
export const authService = {
  register: (fullName, username, email, phone, password, passwordConfirm, farmName) =>
    apiClient.post('/auth/register', { fullName, username, email, phone, password, passwordConfirm, farmName }),
  
  login: (username, password) =>
    apiClient.post('/auth/login', { username, password }),
  
  refreshToken: () =>
    apiClient.post('/auth/refresh-token'),
  
  changePassword: (data) =>
    apiClient.post('/auth/change-password', data),
};

// =============== USER ENDPOINTS ===============
export const userService = {
  getCurrentUser: () =>
    apiClient.get('/users/me'),
  
  getAllUsers: () =>
    apiClient.get('/users'),

  getUserById: (userId) =>
    apiClient.get(`/users/${userId}`),

  getWorkers: () =>
    apiClient.get('/users/workers'),
  
  updateUser: (userId, userData) =>
    apiClient.put(`/users/${userId}`, userData),
  
  updateUserRole: (userId, roleId) =>
    apiClient.put(`/users/${userId}/role`, { role_id: roleId }),
  
  lockUser: (userId) =>
    apiClient.put(`/users/${userId}/lock`),
  
  unlockUser: (userId) =>
    apiClient.put(`/users/${userId}/unlock`),
  
  resetPassword: (userId) =>
    apiClient.post(`/users/${userId}/reset-password`),
  
  deleteUser: (userId) =>
    apiClient.delete(`/users/${userId}`),

  // Update role by name (e.g., 'OWNER') - used by Owner interface
  updateUserRoleByName: (userId, roleName) =>
    apiClient.put(`/users/${userId}/role`, { role: roleName }),

  // Remove user from farm (set farm_id = NULL)
  removeFromFarm: (userId) =>
    apiClient.put(`/users/${userId}/remove-from-farm`),

  // Assign user to farm (set farm_id)
  assignToFarm: (userId, farmId) =>
    apiClient.put(`/users/${userId}/assign-to-farm`, { farm_id: farmId }),
  
  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/users/change-password', { oldPassword, newPassword }),
  
  updateProfile: (userData) =>
    apiClient.put('/users/me', userData),

  updateProfileAvatar: (formData) =>
    apiClient.post('/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  // Create user (ADMIN or OWNER)
  createUser: (userData) =>
    apiClient.post('/users', userData),
};

// NOTE: admin endpoints removed — use role-specific services instead

// =============== POND ENDPOINTS ===============
export const pondService = {
  getAllPonds: () =>
    apiClient.get('/ponds'),
  
  getPondById: (pondId) =>
    apiClient.get(`/ponds/${pondId}`),
  
  createPond: (pondData) =>
    apiClient.post('/ponds', pondData),
  
  updatePond: (pondId, pondData) =>
    apiClient.put(`/ponds/${pondId}`, pondData),

  updateUsageStatus: (pondId, usageStatus) =>
    apiClient.patch(`/ponds/${pondId}/usage-status`, { usageStatus }),
  
  deletePond: (pondId) =>
    apiClient.delete(`/ponds/${pondId}`),

  getAssignmentMatrix: () =>
    apiClient.get('/ponds/owner/assignment-matrix'),

  getWorkerAssignmentMatrix: () =>
    apiClient.get('/ponds/owner/worker-assignment-matrix'),

  updateAssignment: (pondId, technicianId) =>
    apiClient.put(`/ponds/${pondId}/assignment`, { technicianId }),

  updateWorkerAssignment: (pondId, workerId, assign = true) =>
    apiClient.put(`/ponds/${pondId}/worker-assignment`, { workerId, assign }),

  completeRenovation: (pondId) =>
    apiClient.patch(`/ponds/${pondId}/renovation-complete`),
  
  assignStaff: (pondId, staffId) =>
    apiClient.post(`/ponds/${pondId}/assign-staff`, { staffId }),
};


// =============== SEASON ENDPOINTS ===============
export const seasonService = {
  getAllSeasons: (params = {}) =>
    apiClient.get('/seasons', { params }),
  
  getSeasonById: (seasonId) =>
    apiClient.get(`/seasons/${seasonId}`),
  
  createSeason: (seasonData) =>
    apiClient.post('/seasons', seasonData),
  
  updateSeason: (seasonId, seasonData) =>
    apiClient.put(`/seasons/${seasonId}`, seasonData),
  
  deleteSeason: (seasonId) =>
    apiClient.delete(`/seasons/${seasonId}`),
  
  harvestSeason: (seasonId, data) =>
    apiClient.post(`/seasons/${seasonId}/harvest`, data),
};

// =============== CULTIVATION LOG ENDPOINTS ===============
export const cultivationLogService = {
  getBySeasonId: (seasonId) =>
    apiClient.get(`/cultivation-logs/season/${seasonId}`),
  
  getByPondId: (pondId) =>
    apiClient.get(`/cultivation-logs/pond/${pondId}`),
  
  createLog: (logData) =>
    apiClient.post('/cultivation-logs', logData),
  
  updateLog: (logId, logData) =>
    apiClient.put(`/cultivation-logs/${logId}`, logData),
  
  approveLog: (logId) =>
    apiClient.post(`/cultivation-logs/${logId}/approve`),
  
  rejectLog: (logId, reason) =>
    apiClient.post(`/cultivation-logs/${logId}/reject`, { reason }),
  
  lockLogByDate: (seasonId, date) =>
    apiClient.post(`/cultivation-logs/season/${seasonId}/lock-date`, { lockDate: date }),
};

// =============== TASK ENDPOINTS ===============
export const taskService = {
  getAllTasks: () =>
    apiClient.get('/tasks'),
  
  getTaskById: (taskId) =>
    apiClient.get(`/tasks/${taskId}`),
  
  createTask: (taskData) =>
    apiClient.post('/tasks', taskData),
  
  updateTask: (taskId, taskData) =>
    apiClient.put(`/tasks/${taskId}`, taskData),
  
  deleteTask: (taskId) =>
    apiClient.delete(`/tasks/${taskId}`),
  
  updateTaskStatus: (taskId, status) =>
    apiClient.patch(`/tasks/${taskId}/status`, { status }),
  
  uploadTaskImage: (taskId, data) =>
    apiClient.post(`/tasks/${taskId}/upload-image`, data),
};

// feedLogService removed

// =============== ENVIRONMENT LOG ENDPOINTS ===============
export const environmentLogService = {
  getBySeasonId: (seasonId) =>
    apiClient.get(`/environment-logs/season/${seasonId}`),
  
  getByPondId: (pondId) =>
    apiClient.get(`/environment-logs/pond/${pondId}`),
  
  createLog: (logData) =>
    apiClient.post('/environment-logs', logData),

  getThresholds: (seasonId) =>
    apiClient.get(`/environment-logs/season/${seasonId}/thresholds`),
  
  updateThreshold: (seasonId, thresholdData) =>
    apiClient.post(`/environment-logs/season/${seasonId}/thresholds`, thresholdData),

  getThresholdsByPond: (pondId) =>
    apiClient.get(`/environment-logs/pond/${pondId}/thresholds`),
  
  setThresholdsByPond: (pondId, thresholdData) =>
    apiClient.put(`/environment-logs/pond/${pondId}/thresholds`, thresholdData),

  getThresholdsBySensor: (sensorId) =>
    apiClient.get(`/environment-logs/sensor/${sensorId}/thresholds`),

  setThresholdsBySensor: (sensorId, thresholdData) =>
    apiClient.put(`/environment-logs/sensor/${sensorId}/thresholds`, thresholdData),
};

// =============== EXPENSE ENDPOINTS ===============
export const expenseService = {
  getAllExpenses: () =>
    apiClient.get('/expenses'),

  getExpenseCategories: () =>
    apiClient.get('/expenses/categories'),

  createExpenseCategory: (categoryData) =>
    apiClient.post('/expenses/categories', categoryData),
  updateExpenseCategory: (categoryId, categoryData) =>
    apiClient.put(`/expenses/categories/${categoryId}`, categoryData),
  deleteExpenseCategory: (categoryId) =>
    apiClient.delete(`/expenses/categories/${categoryId}`),
  
  getExpensesBySeasonId: (seasonId) =>
    apiClient.get(`/expenses/season/${seasonId}`),

  getTotalExpenseBySeason: (seasonId) =>
    apiClient.get(`/expenses/season/${seasonId}/total`),
  
  createExpense: (expenseData) =>
    apiClient.post('/expenses', expenseData),
  
  updateExpense: (expenseId, expenseData) =>
    apiClient.put(`/expenses/${expenseId}`, expenseData),
  
  deleteExpense: (expenseId) =>
    apiClient.delete(`/expenses/${expenseId}`),
  
  approveExpense: (expenseId) =>
    apiClient.post(`/expenses/${expenseId}/approve`),
  
  rejectExpense: (expenseId) =>
    apiClient.post(`/expenses/${expenseId}/reject`),
  
  getExpenseStats: (seasonId) =>
    apiClient.get(`/expenses/season/${seasonId}/stats`),
};

// =============== DISEASE ENDPOINTS ===============
export const diseaseService = {
  getAllDiseases: () =>
    apiClient.get('/diseases'),
  
  createDisease: (diseaseData) =>
    apiClient.post('/diseases', diseaseData),
  
  updateDisease: (diseaseId, diseaseData) =>
    apiClient.put(`/diseases/${diseaseId}`, diseaseData),
  
  deleteDisease: (diseaseId) =>
    apiClient.delete(`/diseases/${diseaseId}`),
  
  uploadImage: (formData) =>
    apiClient.post('/diseases/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  getPredictions: () =>
    apiClient.get('/diseases/predictions'),
  
  createDiseaseReport: (reportData) =>
    apiClient.post('/diseases/reports', reportData),
  
  confirmPrediction: (predictionId, diseaseId) =>
    apiClient.post(`/diseases/predictions/${predictionId}/confirm`, { diseaseId }),
};

// =============== PRODUCT ENDPOINTS ===============
export const productService = {
  getAllProducts: () =>
    apiClient.get('/inventory/products'),
  
  getProductsByCategory: (category) =>
    apiClient.get(`/inventory/products?search=${encodeURIComponent(category)}`),
  
  createProduct: (productData) =>
    apiClient.post('/inventory/products', productData),
  
  updateProduct: (productId, productData) =>
    apiClient.put(`/inventory/products/${productId}`, productData),
  
  deleteProduct: (productId) =>
    apiClient.delete(`/inventory/products/${productId}`),
};

// =============== SENSOR ENDPOINTS ===============
export const sensorService = {
  getAllSensors: () =>
    apiClient.get('/sensors'),
  
  getSensorsByPondId: (pondId) =>
    apiClient.get(`/sensors/pond/${pondId}`),
  
  getSensorReadings: (sensorId, limit) =>
    apiClient.get(`/sensors/${sensorId}/readings${limit ? `?limit=${limit}` : ''}`),
  
  createSensor: (sensorData) =>
    apiClient.post('/sensors', sensorData),
  
  updateSensor: (sensorId, sensorData) =>
    apiClient.put(`/sensors/${sensorId}`, sensorData),
  
  deleteSensor: (sensorId) =>
    apiClient.delete(`/sensors/${sensorId}`),

  createSensorReading: (sensorId, readingData) =>
    apiClient.post(`/sensors/${sensorId}/readings`, readingData),
};

// =============== NOTIFICATION ENDPOINTS ===============
export const notificationService = {
  getNotifications: () =>
    apiClient.get('/notifications'),
  
  markAsRead: (notificationId) =>
    apiClient.put(`/notifications/${notificationId}/read`),
  
  deleteNotification: (notificationId) =>
    apiClient.delete(`/notifications/${notificationId}`),
};

export default apiClient;
