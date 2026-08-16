// Base URL for all API requests.
//
// - Local development (npm start): no REACT_APP_API_HOST is set, so we
//   default to the backend running on localhost:5000.
// - Production (Docker build): REACT_APP_API_HOST is baked in at build time
//   (see Dockerfile -> ENV REACT_APP_API_HOST="/api"). Requests then go to
//   "/api" on whatever origin the browser loaded the app from, which nginx
//   forwards to the ingress, which routes it to the backend.
const apiHost = process.env.REACT_APP_API_HOST || 'http://localhost:5000';

const baseUrl = apiHost;

export { baseUrl };
