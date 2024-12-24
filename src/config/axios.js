import axios from 'axios'

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
instance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器
instance.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response) {
      // 处理401错误
      if (error.response.status === 401) {
        localStorage.removeItem('admin_token');
        window.location.href = '/login';
      }
      return Promise.reject(error.response.data);
    }
    return Promise.reject(error);
  }
);

export default instance; 