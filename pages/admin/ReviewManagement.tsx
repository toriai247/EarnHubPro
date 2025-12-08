
import React, { useEffect, useState } from 'react';
import GlassCard from '../../components/GlassCard';
import { supabase } from '../../integrations/supabase/client';
import { WebsiteReview } from '../../types';
import { Star, CheckCircle, XCircle, Trash2, Eye, MessageSquare, Loader2, RefreshCw } from 'lucide-react';
import { useUI } from '../../context/UIContext';
import { motion, AnimatePresence } from 'framer-motion';

const ReviewManagement: React.FC = () => {
  const { toast, confirm } = useUI();
  const [reviews, setReviews] = useState<WebsiteReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'public' | 'pending' | 'bug'>('all');

  useEffect(() => {
      fetchReviews();
  }, []);

  const fetchReviews = async () => {
      setLoading(true);
      
      const { data: revs } = await supabase
          .from('website_reviews')
          .select('*')
          .order('created_at', { ascending: false });

      if (revs) {
          // Fetch profiles
          const userIds = Array.from(new Set(revs.map((r: any) => r.user_id).filter(Boolean)));
          const { data: profiles } = await supabase.from('profiles').select('id, name_1, avatar_1, email_1').in('id', userIds);
          const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

          const enriched = revs.map((r: any) => ({
              ...r,
              profile: profileMap.get(r.user_id)
          }));
          setReviews(enriched);
      }
      setLoading(false);
  };

  const togglePublic = async (review: WebsiteReview) => {
      const newVal = !review.is_public;
      const { error } = await supabase.from('website_reviews').update({ is_public: newVal }).eq('id', review.id);
      
      if (error) toast.error("Update failed");
      else {
          setReviews(prev => prev.map(r => r.id === review.id ? { ...r, is_public: newVal } : r));
          toast.success(newVal ? "Review published to homepage" : "Review hidden");
      }
  };

  const handleDelete = async (id: string) => {
      if(!await confirm("Delete this review?")) return;
      await supabase.from('website_reviews').delete().eq('id', id);
      setReviews(prev => prev.filter(r => r.id !== id));
      toast.success("Deleted");
  };

  const filtered = reviews.filter(r => {
      if (filter === 'public') return r.is_public;
      if (filter === 'pending') return !r.is_public;
      if (filter === 'bug') return r.category === 'bug';
      return true;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-20">
        <div className="flex justify-between items-center">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <MessageSquare className="text-pink-500" /> User Reviews
                </h2>
                <p className="text-gray-400 text-sm">Feedback, bugs, and testimonials.</p>
            </div>
            <button onClick={fetchReviews} className="p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition">
                <RefreshCw size={20} className={loading ? 'animate-spin' : ''}/>
            </button>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['all', 'public', 'pending', 'bug'].map(f => (
                <button
                    key={f}
                    onClick={() => setFilter(f as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition border ${filter === f ? 'bg-pink-500/20 border-pink-500 text-pink-400' : 'bg-white/5 border-white/5 text-gray-400'}`}
                >
                    {f}
                </button>
            ))}
        </div>

        {loading ? (
            <div className="p-10"><Loader2 className="animate-spin mx-auto text-white"/></div>
        ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl">No reviews found.</div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map(review => (
                    <GlassCard key={review.id} className="border border-white/10">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-black/50 overflow-hidden border border-white/10">
                                    <img src={review.profile?.avatar_1 || `https://api.dicebear.com/7.x/avataaars/svg?seed=${review.id}`} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <h4 className="text-white font-bold text-sm">{review.profile?.name_1 || 'Anonymous'}</h4>
                                    <div className="flex items-center gap-1">
                                        {Array.from({length: 5}).map((_, i) => (
                                            <Star key={i} size={10} className={i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${review.category === 'bug' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                {review.category}
                            </span>
                        </div>

                        <div className="bg-black/30 p-3 rounded-lg border border-white/5 mb-4 text-sm text-gray-300">
                            "{review.comment}"
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-white/5">
                            <span className="text-[10px] text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => togglePublic(review)}
                                    className={`p-2 rounded-lg transition ${review.is_public ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20' : 'bg-white/10 text-gray-400 hover:text-white'}`}
                                    title={review.is_public ? "Hide from Home" : "Show on Home"}
                                >
                                    {review.is_public ? <CheckCircle size={16} /> : <Eye size={16} />}
                                </button>
                                <button onClick={() => handleDelete(review.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        )}
    </div>
  );
};

export default ReviewManagement;
