'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export default function Reviews() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const fetchUserAndReviews = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUser(user);

        // Use our backend API to fetch reviews
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/reviews/${user.id}`);
          if (response.ok) {
            const data = await response.json();
            setReviews(data);
          } else {
            console.error('Failed to fetch reviews from backend');
          }
        } catch (error) {
          console.error('Error fetching reviews:', error);
        }
      }
      setLoading(false);
    };
    fetchUserAndReviews();
  }, []);

  const handleSendResponse = async (reviewId: string, replyText: string) => {
    if (!replyText) return;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/reviews/post/${reviewId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ replyText }),
      });

      if (response.ok) {
        const { review: updatedReview } = await response.json();
        // Update local state
        setReviews(reviews.map(r => r.id === reviewId ? updatedReview : r));
        alert('Response posted successfully!');
      } else {
        alert('Failed to post response');
      }
    } catch (error) {
      console.error('Error posting response:', error);
      alert('Error posting response');
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'Positive': return 'text-[#00ff00] drop-shadow-[0_0_5px_#00ff00] border-[#00ff00] bg-[rgba(0,255,0,0.1)]';
      case 'Negative': return 'text-[var(--color-neon-pink)] drop-shadow-[0_0_5px_var(--color-neon-pink)] border-[var(--color-neon-pink)] bg-[rgba(255,0,255,0.1)]';
      default: return 'text-[var(--color-neon-cyan)] drop-shadow-[0_0_5px_var(--color-neon-cyan)] border-[var(--color-neon-cyan)] bg-[rgba(0,255,255,0.1)]';
    }
  };

  if (loading) return <div className="p-8 text-[var(--color-neon-pink)] font-mono animate-pulse">Loading reviews...</div>;

  return (
    <div className="p-8 relative z-10">
      <h1 className="text-3xl font-bold text-[var(--color-neon-cyan)] mb-8 drop-shadow-[0_0_8px_var(--color-neon-cyan)] uppercase tracking-wider">Review Management</h1>

      {reviews.length === 0 ? (
        <div className="bg-[#111] border-[1px] border-[var(--color-neon-pink)] p-8 text-center shadow-[0_0_15px_rgba(255,0,255,0.2)]">
          <p className="text-gray-400 font-mono">No reviews found. The background worker will fetch them automatically.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {reviews.map((review) => (
            <div key={review.id} className="bg-[#111] border-2 border-[var(--color-neon-cyan)] p-6 shadow-[0_0_10px_rgba(0,255,255,0.2)] flex flex-col md:flex-row gap-6">

              {/* Review Info */}
              <div className="flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">{review.reviewer_name}</h3>
                    <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
                      <span>Rating: {review.rating}/5</span>
                      <span>•</span>
                      <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Sentiment Tag */}
                  {review.sentiment && (
                    <span className={`px-3 py-1 text-xs font-bold uppercase border-[1px] ${getSentimentColor(review.sentiment)}`}>
                      {review.sentiment}
                    </span>
                  )}
                </div>

                <p className="text-gray-300 italic bg-[#0a0a0a] p-4 border-l-4 border-[var(--color-neon-yellow)] mt-4">
                  &quot;{review.review_text}&quot;
                </p>

                {review.key_topics && review.key_topics.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {review.key_topics.map((topic: string, i: number) => (
                      <span key={i} className="text-xs text-[var(--color-neon-cyan)] bg-[rgba(0,255,255,0.1)] px-2 py-1 rounded">
                        #{topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* AI Draft & Actions */}
              <div className="flex-1 bg-[#1a1a1a] p-6 border-[1px] border-[#333]">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-sm font-bold text-[var(--color-neon-yellow)] uppercase tracking-widest drop-shadow-[0_0_5px_var(--color-neon-yellow)]">
                    AI Suggested Response
                  </h4>
                  <span className={`text-xs font-mono uppercase ${review.status === 'Posted' ? 'text-green-500' : 'text-yellow-500'}`}>
                    Status: {review.status}
                  </span>
                </div>

                <textarea
                  className="w-full h-32 bg-black text-gray-200 border-[1px] border-[var(--color-neon-pink)] p-3 mb-4 focus:outline-none focus:border-[var(--color-neon-cyan)] font-mono text-sm resize-none"
                  defaultValue={review.ai_suggested_response || 'No AI response generated yet.'}
                  id={`response-${review.id}`}
                  readOnly={review.status === 'Posted'}
                />

                {review.status !== 'Posted' && (
                  <button
                    onClick={() => {
                      const text = (document.getElementById(`response-${review.id}`) as HTMLTextAreaElement)?.value;
                      handleSendResponse(review.id, text);
                    }}
                    className="w-full py-3 bg-transparent border-2 border-[var(--color-neon-pink)] text-[var(--color-neon-pink)] font-bold uppercase tracking-widest hover:bg-[var(--color-neon-pink)] hover:text-black transition-all duration-300 shadow-[0_0_10px_var(--color-neon-pink)] hover:shadow-[0_0_20px_var(--color-neon-pink)]"
                  >
                    Send Response
                  </button>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
