import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../lib/hooks/useAuth';
import { LoadingSpinner } from './LoadingSpinner';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 5,
    features: [] as string[],
    improvements: '',
    bugs: '',
    overall: ''
  });

  const featureOptions = [
    'Meme generation quality',
    'Mobile experience',
    'User interface',
    'Loading speed',
    'Dark/light theme',
    'Multi-language captions',
    'Social sharing',
    'Gallery feature',
    'Authentication flow',
    'Token purchase system'
  ];

  const handleFeatureChange = (feature: string, checked: boolean) => {
    if (checked) {
      setFeedback({ ...feedback, features: [...feedback.features, feature] });
    } else {
      setFeedback({ ...feedback, features: feedback.features.filter(f => f !== feature) });
    }
  };

  const submitFeedback = async () => {
    setIsSubmitting(true);
    
    try {
      const headers: any = {
        'Content-Type': 'application/json'
      };

      // Add auth token if user is signed in
      if (user) {
        const token = await user.getIdToken();
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...feedback,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        })
      });

      if (response.ok) {
        toast.success('Thank you for your feedback! 🙏', {
          duration: 4000,
          position: 'top-center'
        });
        onClose();
        // Reset form
        setFeedback({
          rating: 5,
          features: [],
          improvements: '',
          bugs: '',
          overall: ''
        });
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              🤔 Quick Feedback
            </h3>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          {/* Rating */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Overall Experience:
            </label>
            <div className="flex space-x-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedback({ ...feedback, rating: star })}
                  disabled={isSubmitting}
                  className={`text-2xl transition-colors ${
                    star <= feedback.rating ? 'text-yellow-400' : 'text-gray-300'
                  } hover:text-yellow-400 disabled:opacity-50`}
                >
                  ⭐
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                {feedback.rating}/5
              </span>
            </div>
          </div>

          {/* Features that worked well */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
              What worked well? (check all that apply):
            </label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {featureOptions.map(feature => (
                <label key={feature} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={feedback.features.includes(feature)}
                    onChange={(e) => handleFeatureChange(feature, e.target.checked)}
                    disabled={isSubmitting}
                    className="mr-2 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded disabled:opacity-50"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {feature}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              What could be improved?
            </label>
            <textarea
              value={feedback.improvements}
              onChange={(e) => setFeedback({ ...feedback, improvements: e.target.value })}
              disabled={isSubmitting}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
              rows={3}
              placeholder="Any suggestions for improvements..."
            />
          </div>

          {/* Bugs */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Any bugs or issues?
            </label>
            <textarea
              value={feedback.bugs}
              onChange={(e) => setFeedback({ ...feedback, bugs: e.target.value })}
              disabled={isSubmitting}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
              rows={2}
              placeholder="Describe any problems you encountered..."
            />
          </div>

          {/* Additional comments */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Additional comments:
            </label>
            <textarea
              value={feedback.overall}
              onChange={(e) => setFeedback({ ...feedback, overall: e.target.value })}
              disabled={isSubmitting}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                         focus:ring-2 focus:ring-purple-500 focus:border-transparent
                         disabled:opacity-50 disabled:cursor-not-allowed"
              rows={2}
              placeholder="Anything else you'd like to share..."
            />
          </div>

          {/* Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={submitFeedback}
              disabled={isSubmitting}
              className="flex-1 bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 
                         focus:ring-4 focus:ring-purple-200 font-medium transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Sending...
                </>
              ) : (
                'Send Feedback'
              )}
            </button>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 
                         font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Later
            </button>
          </div>

          {/* Thank you note */}
          <div className="mt-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <p className="text-sm text-purple-700 dark:text-purple-300 text-center">
              💜 Your feedback helps us improve MemeMe for everyone!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};