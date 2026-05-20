import React, { createContext, useState, useCallback, useEffect } from 'react';
import { authService, pondService, sensorService } from '../services/api';
import { showToast } from '../utils/toast';

export const AuthContext = createContext();

const normalizeUserRole = (userData) => {
  if (!userData || typeof userData !== 'object') return userData;
  return {
    ...userData,
    role: String(userData.role || '').trim().toUpperCase(),
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Realtime sensor data storage: { pondId: { sensorType: { value, updatedAt, readings: [...] } } }
  const [realtimeSensorData, setRealtimeSensorData] = useState({});
  const [ponds, setPonds] = useState([]);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      let parsedUser = null;
      try {
        parsedUser = JSON.parse(storedUser);
      } catch (err) {
        console.error('Invalid stored user data:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }

      if (parsedUser) {
        const normalizedStoredUser = normalizeUserRole(parsedUser);
        setToken(storedToken);
        setUser(normalizedStoredUser);
        localStorage.setItem('user', JSON.stringify(normalizedStoredUser));
      }
    }
    setLoading(false);
  }, []);
  
  // Background polling for realtime sensor data
  useEffect(() => {
    const currentRole = String(user?.role || '').toUpperCase();
    const canAccessRealtime = ['MANAGER', 'TECHNICIAN'].includes(currentRole);

    if (!token || !user || !canAccessRealtime) {
      setRealtimeSensorData({});
      if (!token || !user) {
        setPonds([]);
      }
      return; // Stop polling if not authenticated
    }

    let isActive = true;

    const pollRealtimeData = async () => {
      try {
        // Get all ponds
        const pondsRes = await pondService.getAllPonds();
        const pondsList = pondsRes?.data?.data || [];
        
        if (!isActive) return;
        
        if (JSON.stringify(ponds) !== JSON.stringify(pondsList)) {
          setPonds(pondsList);
        }

        // For each pond: fetch sensors first; skip fake-realtime generation if no sensors
        const newRealtimeData = {};

        for (const pond of pondsList) {
          try {
            // Get sensors for this pond first
            const sensorsRes = await sensorService.getSensorsByPondId(pond.pond_id);
            const sensors = sensorsRes?.data?.data || [];

            if (!isActive) return;

            // If pond has no sensors, skip generating fake data and continue
            if (sensors.length === 0) {
              newRealtimeData[pond.pond_id] = {};
              continue;
            }

            // Generate fake realtime data (only when sensors exist)
            await sensorService.generateFakeRealtimeData({ pond_id: Number(pond.pond_id) });

            if (!isActive) return;

            // Get readings for each sensor
            const pondData = {};

            for (const sensor of sensors) {
              try {
                const readingsRes = await sensorService.getSensorReadings(sensor.sensor_id, 50);
                const readings = [...(readingsRes?.data?.data || [])].reverse(); // ascending

                if (readings.length > 0) {
                  const latest = readings[readings.length - 1];
                  pondData[sensor.sensor_type] = {
                    value: latest.value,
                    updatedAt: latest.recorded_at,
                    readings: readings,
                    sensorId: sensor.sensor_id,
                  };
                }
              } catch (err) {
                // Skip this sensor on error
                console.error(`Error fetching readings for sensor ${sensor.sensor_id}:`, err);
              }
            }

            newRealtimeData[pond.pond_id] = pondData;
          } catch (err) {
            console.error(`Error polling pond ${pond.pond_id}:`, err);
            newRealtimeData[pond.pond_id] = {};
          }
        }

        if (isActive) {
          setRealtimeSensorData(newRealtimeData);
        }
      } catch (err) {
        console.error('Error polling realtime data:', err);
      }
    };

    // Poll immediately
    pollRealtimeData();

    // Then poll every 30 seconds
    const interval = setInterval(pollRealtimeData, 30000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  // Ensure ponds list is available for all authenticated users (Owner, Manager, Technician)
  useEffect(() => {
    const loadPondsForUser = async () => {
      if (!token || !user) {
        setPonds([]);
        return;
      }

      try {
        const pondsRes = await pondService.getAllPonds();
        const pondsList = pondsRes?.data?.data || [];
        setPonds(pondsList);
      } catch (err) {
        console.error('Error loading ponds for user:', err);
      }
    };

    loadPondsForUser();
  }, [token, user]);

  const login = useCallback(async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.login(username, password);
      
      if (response.data.success) {
        const { user: userData, token: newToken } = response.data;
        const normalizedUser = normalizeUserRole(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        
        setToken(newToken);
        setUser(normalizedUser);
        
        return { success: true, user: normalizedUser };
      } else {
        throw new Error(response.data.message || 'ng nh�p th�t b�i');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'L�i ng nh�p';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (fullName, username, email, password, passwordConfirm, farmName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authService.register(fullName, username, email, password, passwordConfirm, farmName);
      
      if (response.data.success) {
        const { user: userData, token: newToken } = response.data;
        const normalizedUser = normalizeUserRole(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        
        setToken(newToken);
        setUser(normalizedUser);
        
        return { success: true, user: normalizedUser };
      } else {
        throw new Error(response.data.message || 'ng k� th�t b�i');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'L�i ng k�';
      setError(message);
      return { success: false, message };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setError(null);
    try {
      showToast({ title: 'Đăng xuất thành công', type: 'success' });
    } catch (err) {
      // If toast fails for any reason, fail silently but keep logout behavior
      // eslint-disable-next-line no-console
      console.error('Error showing logout toast:', err);
    }
  }, []);

  const isAuthenticated = !!token && !!user;
  const userRole = user?.role;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        error,
        isAuthenticated,
        userRole,
        setUser,
        login,
        register,
        logout,
        realtimeSensorData,
        ponds,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
