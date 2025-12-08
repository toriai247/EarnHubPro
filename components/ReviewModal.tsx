
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, X, MessageSquare, Bug, Lightbulb, ThumbsUp, Loader2, Send } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { useUI } from '../context/UIContext';
import GlassCard from './GlassCard';

interface ReviewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ReviewModal: React.FC<ReviewModalProps> = ({ isOpen, onClose }) => {
    const { toast } = useUI();
    const [rating, setRating] = useState(5);
    const [category, setCategory] = useState<'bug' | 'suggestion' | 'compliment' | 'other'>('compliment');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!comment.trim()) {
            toast.error("Please provide some feedback.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error("Please login to submit feedback.");
                return;
            }

            const { error } = await supabase.from('website_reviews').insert({
                user_id: session.user.id,
                rating,
                category,
                comment: comment.trim(),
                is_public: false // Admins must approve
            });

            if (error) throw error;

            toast.success("Thank you for your feedback!");
            onClose();
            // Reset form
            setRating(5);
            setComment('');
            setCategory('compliment');

        } catch (e: any) {
            toast.error("Error: " + e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    
                    <motion.div 
                        initial={{ scale: 0.9, y: 50, opacity: 0 }} 
                        animate={{ scale: 1, y: 0, opacity: 1 }} 
                        exit={{ scale: 0.9, y: 50, opacity: 0 }} 
                        className="w-full max-w-md relative z-10"
                    >
                        <GlassCard className="border border-white/10 bg-[#111]">
                            <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
                                <X size={20} />
                            </button>

                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-bold text-white mb-2">Rate Your Experience</h2>
                                <p className="text-sm text-gray-400">Help us improve Naxxivo for everyone.</p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Stars */}
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                                        >
                                            <Star 
                                                size={32} 
                                                className={star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-600"} 
                                            />
                                        </button>
                                    ))}
                                </div>
                                <p className="text-center text-xs font-bold text-yellow-400 uppercase tracking-widest">
                                    {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Okay' : 'Needs Work'}
                                </p>

                                {/* Category */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Feedback Type</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button 
                                            type="button" 
                                            onClick={() => setCategory('compliment')}
                                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${category === 'compliment' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <ThumbsUp size={14}/> Compliment
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setCategory('bug')}
                                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${category === 'bug' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Bug size={14}/> Report Bug
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setCategory('suggestion')}
                                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${category === 'suggestion' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <Lightbulb size={14}/> Suggestion
                                        </button>
                                        <button 
                                            type="button" 
                                            onClick={() => setCategory('other')}
                                            className={`p-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition ${category === 'other' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            <MessageSquare size={14}/> Other
                                        </button>
                                    </div>
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">Details</label>
                                    <textarea 
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:border-white/30 outline-none resize-none h-24 placeholder:text-gray-600"
                                        placeholder={category === 'bug' ? "Describe what happened..." : "Tell us what you think..."}
                                    />
                                </div>

                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition flex items-center justify-center gap-2 uppercase tracking-wide"
                                >
                                    {isSubmitting ? <Loader2 className="animate-spin" size={18}/> : <><Send size={18}/> Submit Review</>}
                                </button>
                            </form>
                        </GlassCard>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ReviewModal;
