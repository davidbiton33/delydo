import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { resetPassword } from '../../services/authService';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!email) {
      setError('נא להזין כתובת דוא"ל');
      return;
    }

    try {
      setError('');
      setSuccess('');
      setLoading(true);

      const result = await resetPassword(email);
      setSuccess(result.message);
      // Return to login mode after 5 seconds
      setTimeout(() => {
        setResetMode(false);
        setSuccess('');
      }, 5000);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError('נא למלא את כל השדות');
      return;
    }

    try {
      setError('');
      setLoading(true);

      // Hardcoded login for davidbiton2@gmail.com (Super Admin)
      if (email === 'davidbiton2@gmail.com') {
        // Special login for superAdmin

        try {
          await signInWithEmailAndPassword(auth, email, password);
          localStorage.setItem('userType', 'superAdmin');
          localStorage.setItem('displayName', 'דוד ביטון');
          window.location.href = '/superadmin';
          return;
        } catch (error) {
          console.error('Error logging in as superAdmin:', error);
          setError(error.message || 'שגיאה בהתחברות');
          setLoading(false);
          return;
        }
      }

      // Normal login flow for other users
      const result = await login(email, password);

      // Redirect based on user type
      if (result.type === 'business') {
        navigate('/business');
      } else if (result.type === 'courier') {
        navigate('/courier');
      } else if (result.type === 'admin') {
        navigate('/admin');
      } else if (result.type === 'superAdmin') {
        navigate('/superadmin');
      } else {
        // If user type is unknown, stay on login page
        setError('סוג משתמש לא מזוהה. אנא פנה למנהל המערכת.');
      }
    } catch (error) {
      console.error('Login error:', error);

      // Use a generic error message regardless of the specific error
      setError('פרטי ההתחברות שגויים. אנא נסה שוב');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>{resetMode ? 'איפוס סיסמה' : 'התחברות למערכת'}</h1>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        {resetMode ? (
          <form onSubmit={handleResetPassword}>
            <div className="form-group">
              <label htmlFor="email">דואר אלקטרוני</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הזן דואר אלקטרוני"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'שולח...' : 'שלח הוראות איפוס'}
            </button>

            <div className="login-links">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setResetMode(false);
                  setError('');
                  setSuccess('');
                }}
              >
                חזרה להתחברות
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">דואר אלקטרוני</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="הזן דואר אלקטרוני"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">סיסמה</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="הזן סיסמה"
                required
              />
            </div>

            <button
              type="submit"
              className="btn-primary login-btn"
              disabled={loading}
            >
              {loading ? 'מתחבר...' : 'התחבר'}
            </button>

            <div className="login-links">
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setResetMode(true);
                  setError('');
                }}
              >
                שכחתי סיסמה
              </button>
            </div>
          </form>
        )}

        <div className="login-footer">
          <p>שירות משלוחים דלי - מערכת ניהול</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
