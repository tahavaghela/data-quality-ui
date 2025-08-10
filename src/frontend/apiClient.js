import axios from 'axios';

// Create a pre-configured Axios client.
const apiClient = axios.create({
  // IMPORTANT: This should be your backend's base URL, configured in Vercel.
  baseURL: import.meta.env.VITE_API_BASE_URL, 
  // This is the crucial line: it ensures the browser sends the access_token cookie
  // with every request to the backend.
  withCredentials: true,
});

// Add a global interceptor to handle 401 Unauthorized errors gracefully.
// It no longer forces a hard redirect, which caused the infinite loop.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // If the server responds with a 401, simply reject the promise.
    // The component making the API call will then handle the unauthenticated state.
    if (error.response && error.response.status === 401) {
      console.error('Unauthorized request.');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
