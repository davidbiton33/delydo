import { createRoot } from 'react-dom/client'
import App from './App.jsx'
// Initialize Firebase
import './firebase'

createRoot(document.getElementById('root')).render(
    <App />
)
