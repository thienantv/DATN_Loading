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
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// =============== AUTH ENDPOINTS ===============
export const authService = {
  register: (fullName, username, email, password, passwordConfirm) =>
    apiClient.post('/auth/register', { fullName, username, email, password, passwordConfirm }),
  
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

  getStaff: () =>
    apiClient.get('/users/staff'),
  
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
  
  changePassword: (oldPassword, newPassword) =>
    apiClient.post('/users/change-password', { oldPassword, newPassword }),
  
  updateProfile: (userData) =>
    apiClient.put('/users/me', userData),
};

// =============== ADMIN ENDPOINTS ===============
export const adminService = {
  // Users Management
  getAllUsers: () =>
    apiClient.get('/admin/users'),
  
  createUser: (userData) =>
    apiClient.post('/admin/users', userData),
  
  getUserLoginLogs: (userId) =>
    apiClient.get(`/admin/users/${userId}/login-logs`),
  
  // Stats
  getSystemStats: () =>
    apiClient.get('/admin/stats/overview'),
  
  getUserStats: () =>
    apiClient.get('/admin/stats/users'),
  
  getPondStats: () =>
    apiClient.get('/admin/stats/ponds'),
  
  getSeasonStats: () =>
    apiClient.get('/admin/stats/seasons'),
  
  // Reports
  getProductionReport: () =>
    apiClient.get('/admin/reports/production'),
  
  getFinancialReport: () =>
    apiClient.get('/admin/reports/financial'),
  
  getHealthReport: () =>
    apiClient.get('/admin/reports/health'),
  
  // Activity Logs
  getActivityLogs: (filters = {}) =>
    apiClient.get('/admin/activity-logs', { params: filters }),
  
  // AI Management
  getTrainingData: () =>
    apiClient.get('/admin/ai/training-data'),
  
  uploadTrainingData: (formData) =>
    apiClient.post('/admin/ai/training-data', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  deleteTrainingData: (dataId) =>
    apiClient.delete(`/admin/ai/training-data/${dataId}`),
  
  getPredictionHistory: () =>
    apiClient.get('/admin/ai/predictions'),
  
  updateAIModel: (modelData) =>
    apiClient.post('/admin/ai/model/update', modelData),
  
  getModelStatus: () =>
    apiClient.get('/admin/ai/model/status'),
  
  // Data Summary
  getDataSummary: () =>
    apiClient.get('/admin/data/summary'),
};

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
  
  deletePond: (pondId) =>
    apiClient.delete(`/ponds/${pondId}`),
  
  assignStaff: (pondId, staffId) =>
    apiClient.post(`/ponds/${pondId}/assign-staff`, { staffId }),
};

// =============== SEASON ENDPOINTS ===============
export const seasonService = {
  getAllSeasons: () =>
    apiClient.get('/seasons'),
  
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

// =============== FEED LOG ENDPOINTS ===============
export const feedLogService = {
  getFeedLogsBySeasonId: (seasonId) =>
    apiClient.get(`/feed-logs/season/${seasonId}`),
  
  getFeedLogDetail: (feedLogId) =>
    apiClient.get(`/feed-logs/${feedLogId}`),
  
  createFeedLog: (feedLogData) =>
    apiClient.post('/feed-logs', feedLogData),
  
  updateFeedLog: (feedLogId, feedLogData) =>
    apiClient.put(`/feed-logs/${feedLogId}`, feedLogData),
};

// =============== ENVIRONMENT LOG ENDPOINTS ===============
export const environmentLogService = {
  getBySeasonId: (seasonId) =>
    apiClient.get(`/environment-logs/season/${seasonId}`),
  
  getByPondId: (pondId) =>
    apiClient.get(`/environment-logs/pond/${pondId}`),
  
  createLog: (logData) =>
    apiClient.post('/environment-logs', logData),
  
  updateThreshold: (seasonId, thresholdData) =>
    apiClient.post(`/environment-logs/season/${seasonId}/thresholds`, thresholdData),
};

// =============== EXPENSE ENDPOINTS ===============
export const expenseService = {
  getAllExpenses: () =>
    apiClient.get('/expenses'),

  getExpenseCategories: () =>
    apiClient.get('/expenses/categories'),
  
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
    apiClient.get('/products'),
  
  getProductsByCategory: (category) =>
    apiClient.get(`/products?category=${category}`),
  
  createProduct: (productData) =>
    apiClient.post('/products', productData),
  
  updateProduct: (productId, productData) =>
    apiClient.put(`/products/${productId}`, productData),
  
  deleteProduct: (productId) =>
    apiClient.delete(`/products/${productId}`),
};

// =============== SENSOR ENDPOINTS ===============
export const sensorService = {
  getAllSensors: () =>
    apiClient.get('/sensors'),
  
  getSensorsByPondId: (pondId) =>
    apiClient.get(`/sensors/pond/${pondId}`),
  
  getSensorReadings: (sensorId, limit) =>
    apiClient.get(`/sensors/${sensorId}/readings${limit ? `?limit=${limit}` : ''}`),

  getSensorReadingsByRange: (sensorId, startDate, endDate) =>
    apiClient.get(`/sensors/${sensorId}/readings/range?startDate=${startDate}&endDate=${endDate}`),
  
  createSensor: (sensorData) =>
    apiClient.post('/sensors', sensorData),

  generateFakeRealtimeData: (data) =>
    apiClient.post('/sensors/fake-realtime', data),
  
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
