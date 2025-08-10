import axios from 'axios';

// Create a pre-configured Axios client.
const apiClient = axios.create({
  // IMPORTANT: Set this to your backend's base URL
  baseURL: 'https://fastapi-backend-508881353671.asia-south1.run.app', 
  
  // This is the crucial line: it ensures the browser sends the access_token cookie
  // with every request to the backend.
  withCredentials: true,
});

// Add an interceptor to handle 401 Unauthorized errors globally.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server responds with a 401, it means the token is missing or expired.
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized request. Redirecting to login.');
      // Redirect the user to the login page to re-authenticate.
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default apiClient;
