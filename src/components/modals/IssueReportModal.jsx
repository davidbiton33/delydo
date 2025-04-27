import React, { useState } from 'react';
import { getDatabase, ref, update } from 'firebase/database';
import Modal from '../common/Modal';
import '../forms/Forms.css';
import './IssueReportModal.css';

const IssueReportModal = ({ isOpen, onClose, taskId, onSuccess }) => {
  const [selectedIssue, setSelectedIssue] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Common delivery issues
  const issueOptions = [
    {
      value: 'customer_unavailable',
      label: 'לקוח לא עונה / לא זמין',
      icon: '📵',
      description: 'לקוח לא עונה לטלפון או לא נמצא בכתובת'
    },
    {
      value: 'address_not_found',
      label: 'לא מוצא את הכתובת',
      icon: '🔍',
      description: 'כתובת לא קיימת או לא ניתן למצוא אותה'
    },
    {
      value: 'accident',
      label: 'תאונה / עיכוב בדרך',
      icon: '🚨',
      description: 'תאונה או עיכוב משמעותי בדרך'
    },
    {
      value: 'damaged_package',
      label: 'משלוח ניזוק',
      icon: '📦💔',
      description: 'המשלוח ניזוק במהלך ההובלה'
    },
    {
      value: 'wrong_address',
      label: 'כתובת שגויה',
      icon: '🗺️',
      description: 'הכתובת שסופקה שגויה או לא מדויקת'
    },
    {
      value: 'customer_refused',
      label: 'לקוח סירב לקבל',
      icon: '🚫',
      description: 'הלקוח סירב לקבל את המשלוח'
    },
    {
      value: 'vehicle_breakdown',
      label: 'תקלה ברכב',
      icon: '🚗',
      description: 'תקלה ברכב שמונעת המשך הובלה'
    },
    {
      value: 'other',
      label: 'אחר',
      icon: '❓',
      description: 'תקלה אחרת שאינה מופיעה ברשימה'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedIssue) {
      setError('נא לבחור סוג תקלה');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const db = getDatabase();
      const taskRef = ref(db, `deliveryTasks/${taskId}`);

      // Update task with issue report
      await update(taskRef, {
        status: 'issue_reported',
        issueType: selectedIssue,
        issueComments: comments || '',
        issueReportedAt: new Date().toISOString()
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      console.error('Error reporting issue:', error);
      setError(error.message || 'אירעה שגיאה בעת דיווח התקלה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="form-container issue-report-container">
        <h2>דיווח על תקלה במשלוח</h2>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="issue-options-container">
            {issueOptions.map(option => (
              <div
                key={option.value}
                className={`issue-option ${selectedIssue === option.value ? 'selected' : ''}`}
                onClick={() => setSelectedIssue(option.value)}
              >
                <div className="issue-icon">{option.icon}</div>
                <div className="issue-label">{option.label}</div>
                <div className="issue-description">{option.description}</div>
              </div>
            ))}
          </div>

          <div className="form-group">
            <label htmlFor="comments">הערות נוספות:</label>
            <textarea
              id="comments"
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              rows="4"
              className="form-textarea"
              placeholder="פרטים נוספים על התקלה (אופציונלי)"
            ></textarea>
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'שולח...' : 'שלח דיווח'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default IssueReportModal;
