import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'; // 👈 add this
import App from './App.jsx'
import { AuthProvider } from './AuthContext.jsx'; // 👈 make sure AuthProvider is imported
import './index.css'

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>,
)
