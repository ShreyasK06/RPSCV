import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import reportWebVitals from './reportWebVitals';

//   "homepage": "https://shreyasK06.github.io/RPSCV",
const router = createHashRouter([
  { path: '/', element: <App /> },
]);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
reportWebVitals();
