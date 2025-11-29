
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { Megaphone, Plus, DollarSign, Calculator, Link as LinkIcon, Users, CheckCircle, AlertCircle, PlayCircle, Share2, Smartphone, Eye, X, Check, FileText, Image as ImageIcon, Zap, Search, Star, PenTool, Clock, Filter, ListFilter, ArrowUpDown } from 'lucide-react';
import { supabase } from '../integrations/supabase/client';
import { WalletData, MarketTask, MarketSubmission } from '../types';
import { updateWallet, createTransaction } from '../lib/actions';
import { useUI } from '../context/UIContext';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import BalanceDisplay from '../components/BalanceDisplay';

const Advertise: React.FC = () => {
  const { toast, confirm } = useUI();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create');
  const [loading, setLoading] = useState(true);
  const [myCampaigns, setMyCampaigns] = useState<MarketTask[]>([]);
  const [pendingSubmissions, setPendingSubmissions] = useState<any[]>([]);
  
  // Form State
  const [category, setCategory] = useState('social');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [url, setUrl] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [pricePerAction, setPricePerAction] = useState<number>(0.05); // Default $0.05
  const [proofType, setProofType] = useState<'screenshot' | 'text' | 'auto'>('screenshot');
  const [timerSeconds, setTimerSeconds] = useState<number>(30); // Default 30s
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manage Tab Filters
  const [manageSearch, setManageSearch] = useState('');
  const [manageStatus, setManageStatus] = useState('all');
  const [manageSort, setManageSort] = useState('newest');

  // Constants
  const MIN_PRICE = 0.02; // Minimum $0.02 per action
  const ADMIN_FEE_PERCENT = 30; // 30% retained by system

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: w } = await supabase.from('wallets').select('*').eq('user_id', session.user.id).single();
            if (w) setWallet(w as WalletData);

            const { data: c } = await supabase.from('marketplace_tasks').select('*').eq('creator_id', session.user.id).order('created_at', {ascending: false});
            if (c) {
                setMyCampaigns(c as any);
                // Fetch pending submissions for these campaigns
                const campaignIds = c.map(t => t.id);
                if (campaignIds.length > 0) {
                    // 1. Fetch Submissions
                    const { data: s } = await supabase.from('marketplace_submissions')
                        .select('*')
                        .in('task_id', campaignIds)
                        .eq('status', 'pending');
                    
                    if (s && s.length > 0) {
                        // 2. Fetch Profiles Manually (Avoids FK Issues)
                        const workerIds = Array.from(new Set(s.map((sub: any) => sub.worker_id)));
                        if (workerIds.length > 0) {
                            const { data: profiles } = await supabase.from('profiles').select('id, name_1, email_1').in('id', workerIds);
                            const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

                            const enrichedSubmissions = s.map((sub: any) => ({
                                ...sub,
                                profiles: profileMap.get(sub.worker_id) || { name_1: 'Unknown User', email_1: 'No Email' }
                            }));
                            setPendingSubmissions(enrichedSubmissions);
                        }
                    } else {
                        setPendingSubmissions([]);
                    }
                }
            }
        }
    } catch (e) {
        console.error("Fetch Data Error:", e);
    } finally {
        setLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!wallet) return;

      // Validation
      if (!title || !url) { toast.error("Please fill all fields"); return; }
      if (quantity < 10) { toast.error("Minimum quantity is 10"); return; }
      if (pricePerAction < MIN_PRICE) { toast.error(`Minimum price is $${MIN_PRICE}`); return; }
      if (timerSeconds < 5) { toast.error("Minimum duration is 5 seconds"); return; }

      const totalCost = quantity * pricePerAction;
      
      if (totalCost > wallet.deposit_balance) {
          toast.error(`Insufficient Deposit Balance. Need $${totalCost.toFixed(2)}`);
          return;
      }

      if (!await confirm(`Create Campaign "${title}" for $${totalCost.toFixed(2)}?`, "Confirm Payment")) return;

      setIsSubmitting(true);
      try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("No session");

          // 1. Deduct from Deposit Balance
          await updateWallet(session.user.id, totalCost, 'decrement', 'deposit_balance');
          // FIX: Use 'invest' type instead of 'task_create' to satisfy DB constraint
          await createTransaction(session.user.id, 'invest', totalCost, `Ads: ${title}`);

          // 2. Create Task
          const workerReward = pricePerAction * ((100 - ADMIN_FEE_PERCENT) / 100);
          
          // Determine default description if empty
          let finalDesc = description;
          if (!finalDesc) {
              if (category === 'seo') finalDesc = "Search keyword in Google, find website, visit and stay 1 min.";
              else if (category === 'review') finalDesc = "Give 5 star rating and positive review. Screenshot proof.";
              else if (proofType === 'screenshot') finalDesc = "Please upload a valid screenshot proof.";
              else if (proofType === 'text') finalDesc = "Please submit the required text/username.";
              else finalDesc = "Complete the action to earn reward.";
          }

          const { error } = await supabase.from('marketplace_tasks').insert({
              creator_id: session.user.id,
              title,
              description: finalDesc,
              category,
              target_url: url,
              total_quantity: quantity,
              remaining_quantity: quantity,
              price_per_action: pricePerAction,
              worker_reward: workerReward,
              proof_type: proofType,
              timer_seconds: timerSeconds,
              status: 'active'
          });

          if (error) throw error;

          toast.success("Campaign Created Successfully!");
          
          // Trigger global wallet update
          window.dispatchEvent(new Event('wallet_updated'));

          // Reset Form
          setTitle('');
          setUrl('');
          setDescription('');
          setQuantity(100);
          setTimerSeconds(30);
          fetchData(); 
          setActiveTab('manage');

      } catch (e: any) {
          toast.error("Error: " + e.message);
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleReviewSubmission = async (submissionId: string, action: 'approved' | 'rejected', task: MarketTask) => {
      try {
          // Get the submission details
          const { data: sub } = await supabase.from('marketplace_submissions').select('*').eq('id', submissionId).single();
          if (!sub) return;

          if (action === 'approved') {
              // Pay the worker - Update all earning stats
              await updateWallet(sub.worker_id, task.worker_reward, 'increment', 'earning_balance');
              await updateWallet(sub.worker_id, task.worker_reward, 'increment', 'total_earning');
              await updateWallet(sub.worker_id, task.worker_reward, 'increment', 'today_earning');
              
              await createTransaction(sub.worker_id, 'earn', task.worker_reward, `Task Approved: ${task.title}`);
              toast.success("Worker Paid!");
          } else {
              // Reject - Refund the Advertiser (Full Price per action)
              const refundAmount = task.price_per_action;
              await updateWallet(task.creator_id, refundAmount, 'increment', 'deposit_balance');
              
              // Trigger wallet update for the advertiser (current user)
              window.dispatchEvent(new Event('wallet_updated'));
              
              toast.info("Submission Rejected. Cost Refunded.");
          }

          // Update Status
          await supabase.from('marketplace_submissions').update({ status: action }).eq('id', submissionId);
          
          // Remove from local list
          setPendingSubmissions(prev => prev.filter(s => s.id !== submissionId));
          // Refresh data to show new balance if refunded
          fetchData();

      } catch (e: any) {
          toast.error(e.message);
      }
  };

  const handleToggleStatus = async (task: MarketTask) => {
      const newStatus = task.status === 'active' ? 'paused' : 'active';
      const { error } = await supabase.from('marketplace_tasks').update({ status: newStatus }).eq('id', task.id);
      if (!error) {
          setMyCampaigns(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
          toast.success(`Campaign ${newStatus}`);
      }
  };

  const totalCost = quantity * pricePerAction;
  const userEarns = pricePerAction * ((100 - ADMIN_FEE_PERCENT) / 100);

  const getPlaceholderInstruction = () => {
      switch(proofType) {
          case 'screenshot': return "e.g. Upload a screenshot showing you liked the page and followed.";
          case 'text': return "e.g. Enter the Secret Code found in the video.";
          case 'auto': return "e.g. Visit the link and wait for 10 seconds.";
          default: return "Instructions for the worker...";
      }
  };

  // Filter and Sort Logic
  const filteredCampaigns = myCampaigns
    .filter(c => {
        const matchesSearch = c.title.toLowerCase().includes(manageSearch.toLowerCase());
        const matchesStatus = manageStatus === 'all' || c.status === manageStatus;
        return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
        if (manageSort === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (manageSort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (manageSort === 'budget') return (b.total_quantity * b.price_per_action) - (a.total_quantity * a.price_per_action);
        return 0;
    });

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* Header */}
        <header className="flex justify-between items-center pt-4">
            <div>
                <h1 className="text-2xl font-display font-black text-white flex items-center gap-2">
                    <Megaphone className="text-purple-500" /> ADVERTISE
                </h1>
                <p className="text-xs text-gray-400">Promote your links to thousands of users.</p>
            </div>
            
            <div className="bg-blue-900/30 border border-blue-500/30 px-4 py-2 rounded-xl text-right">
                <p className="text-[10px] text-blue-300 font-bold uppercase">Deposit Balance</p>
                <p className="text-lg font-black text-white font-mono"><BalanceDisplay amount={wallet?.deposit_balance || 0}/></p>
            </div>
        </header>

        {/* Tabs */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button onClick={() => setActiveTab('create')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${activeTab === 'create' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                Create Campaign
            </button>
            <button onClick={() => setActiveTab('manage')} className={`flex-1 py-3 rounded-lg text-sm font-bold transition ${activeTab === 'manage' ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>
                Manage & Review
                {pendingSubmissions.length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingSubmissions.length}</span>}
            </button>
        </div>

        {activeTab === 'create' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                
                {/* Form */}
                <GlassCard>
                    <form onSubmit={handleCreateCampaign} className="space-y-5">
                        
                        {/* Category Selector */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Campaign Type</label>
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { id: 'social', label: 'Social', icon: Share2 },
                                    { id: 'video', label: 'Video', icon: PlayCircle },
                                    { id: 'app', label: 'App', icon: Smartphone },
                                    { id: 'seo', label: 'SEO/Visit', icon: Search },
                                    { id: 'review', label: 'Review', icon: Star },
                                    { id: 'content', label: 'Content', icon: PenTool },
                                ].map(cat => (
                                    <button 
                                        type="button"
                                        key={cat.id}
                                        onClick={() => setCategory(cat.id)}
                                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition ${category === cat.id ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
                                    >
                                        <cat.icon size={20} className="mb-1" />
                                        <span className="text-xs font-bold">{cat.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title & URL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Title</label>
                                <input 
                                    required type="text" value={title} onChange={e => setTitle(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                                    placeholder={category === 'seo' ? "Search Keyword + Visit" : "e.g. Follow my Page"}
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><LinkIcon size={12}/> Target URL</label>
                                <input 
                                    required type="url" value={url} onChange={e => setUrl(e.target.value)} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>

                        {/* Proof Type Grid */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Validation Method (Proof)</label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div 
                                    onClick={() => setProofType('screenshot')}
                                    className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center text-center transition ${proofType === 'screenshot' ? 'bg-purple-500/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/30 border-white/10 text-gray-500 hover:bg-white/5'}`}
                                >
                                    <ImageIcon size={24} className="mb-2" />
                                    <h4 className="font-bold text-sm">Screenshot</h4>
                                    <p className="text-[10px] opacity-70 mt-1">User uploads image proof</p>
                                </div>
                                <div 
                                    onClick={() => setProofType('text')}
                                    className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center text-center transition ${proofType === 'text' ? 'bg-purple-500/20 border-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-black/30 border-white/10 text-gray-500 hover:bg-white/5'}`}
                                >
                                    <FileText size={24} className="mb-2" />
                                    <h4 className="font-bold text-sm">Secret Code</h4>
                                    <p className="text-[10px] opacity-70 mt-1">User enters code from content</p>
                                </div>
                                <div 
                                    onClick={() => setProofType('auto')}
                                    className={`cursor-pointer p-4 rounded-xl border flex flex-col items-center text-center transition ${proofType === 'auto' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'bg-black/30 border-white/10 text-gray-500 hover:bg-white/5'}`}
                                >
                                    <Zap size={24} className="mb-2" />
                                    <h4 className="font-bold text-sm">Timer Only</h4>
                                    <p className="text-[10px] opacity-70 mt-1">Pay after waiting (Risky)</p>
                                </div>
                            </div>
                        </div>

                        {/* Min Duration */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><Clock size={12}/> Min Duration (Seconds)</label>
                            <input 
                                required type="number" min="5" max="300" value={timerSeconds} onChange={e => setTimerSeconds(parseInt(e.target.value))} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                                placeholder="30"
                            />
                            <p className="text-[10px] text-gray-500 mt-1">User must wait this long before submitting. Helps prevent fake clicks.</p>
                        </div>

                        {/* Instructions */}
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase mb-1 block">Instructions for User</label>
                            <textarea 
                                value={description} 
                                onChange={e => setDescription(e.target.value)} 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none h-20 resize-none text-sm"
                                placeholder={getPlaceholderInstruction()}
                            />
                        </div>

                        {/* Quantity & Budget */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><Users size={12}/> Quantity</label>
                                <input 
                                    required type="number" min="10" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><DollarSign size={12}/> Price Per User</label>
                                <input 
                                    required type="number" step="0.01" min={MIN_PRICE} value={pricePerAction} onChange={e => setPricePerAction(parseFloat(e.target.value))} 
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-purple-500 outline-none"
                                />
                            </div>
                        </div>

                        {/* Cost Calculator */}
                        <div className="bg-black/30 p-4 rounded-xl border border-white/10 space-y-2">
                            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-2"><Calculator size={14}/> Cost Breakdown</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Total Budget</span>
                                <span className="text-white font-bold">${totalCost.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-400">Worker Earns</span>
                                <span className="text-green-400 font-bold">${userEarns.toFixed(3)}</span>
                            </div>
                            <div className="h-px bg-white/10 my-1"></div>
                            <p className="text-[10px] text-gray-500 italic">
                                Funds will be deducted from your Deposit Wallet. {ADMIN_FEE_PERCENT}% platform fee included.
                            </p>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="w-full py-4 bg-purple-600 text-white font-black rounded-xl hover:bg-purple-500 transition shadow-lg shadow-purple-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader /> : <><Plus size={20}/> Launch Campaign</>}
                        </button>

                    </form>
                </GlassCard>
            </motion.div>
        )}

        {activeTab === 'manage' && (
            <div className="space-y-6">
                
                {/* 1. Pending Submissions Section */}
                {pendingSubmissions.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-white font-bold text-sm uppercase flex items-center gap-2">
                            <AlertCircle className="text-yellow-400" size={16}/> Pending Reviews ({pendingSubmissions.length})
                        </h3>
                        {pendingSubmissions.map(sub => {
                            const parentTask = myCampaigns.find(c => c.id === sub.task_id);
                            if (!parentTask) return null;

                            return (
                                <GlassCard key={sub.id} className="border-l-4 border-l-yellow-400">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-xs text-gray-400 font-bold uppercase">{parentTask.title}</p>
                                                <p className="text-white text-sm">Worker: {sub.profiles?.name_1 || 'Unknown'}</p>
                                            </div>
                                            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Needs Review</span>
                                        </div>
                                        
                                        <div className="bg-black/40 p-3 rounded-lg text-xs text-gray-300 break-all font-mono border border-white/5">
                                            {sub.proof_data.startsWith('http') && (sub.proof_data.match(/\.(jpeg|jpg|gif|png)$/) != null) ? (
                                                <div className="space-y-2">
                                                    <img src={sub.proof_data} alt={sub.proof_data} className="max-h-40 rounded border border-white/10" />
                                                    <a href={sub.proof_data} target="_blank" rel="noreferrer" className="block text-blue-400 hover:underline">View Full Image</a>
                                                </div>
                                            ) : (
                                                <span>{sub.proof_data}</span>
                                            )}
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                onClick={() => handleReviewSubmission(sub.id, 'approved', parentTask)}
                                                className="flex-1 py-2 bg-green-500/20 text-green-400 font-bold rounded-lg hover:bg-green-500 hover:text-black transition flex items-center justify-center gap-1"
                                            >
                                                <Check size={14}/> Approve
                                            </button>
                                            <button 
                                                onClick={() => handleReviewSubmission(sub.id, 'rejected', parentTask)}
                                                className="flex-1 py-2 bg-red-500/20 text-red-400 font-bold rounded-lg hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-1"
                                            >
                                                <X size={14}/> Reject
                                            </button>
                                        </div>
                                    </div>
                                </GlassCard>
                            )
                        })}
                    </div>
                )}

                {/* 2. Controls & List */}
                <div>
                    <h3 className="text-white font-bold text-sm uppercase mb-3 flex items-center gap-2">
                        My Campaigns
                        <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-gray-400">
                            {filteredCampaigns.length}
                        </span>
                    </h3>

                    {/* Filter & Sort Controls */}
                    <div className="flex flex-col md:flex-row gap-3 mb-4 bg-white/5 p-3 rounded-xl border border-white/5">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16}/>
                            <input 
                                type="text" 
                                value={manageSearch}
                                onChange={e => setManageSearch(e.target.value)}
                                placeholder="Search by title..." 
                                className="w-full bg-black/30 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <div className="relative">
                                <select 
                                    value={manageStatus} 
                                    onChange={e => setManageStatus(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:border-purple-500 outline-none cursor-pointer"
                                >
                                    <option value="all">All Status</option>
                                    <option value="active">Active</option>
                                    <option value="paused">Paused</option>
                                    <option value="completed">Completed</option>
                                </select>
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
                            </div>
                            <div className="relative">
                                <select 
                                    value={manageSort} 
                                    onChange={e => setManageSort(e.target.value)}
                                    className="bg-black/30 border border-white/10 rounded-lg pl-9 pr-8 py-2 text-sm text-white appearance-none focus:border-purple-500 outline-none cursor-pointer"
                                >
                                    <option value="newest">Newest</option>
                                    <option value="oldest">Oldest</option>
                                    <option value="budget">Highest Budget</option>
                                </select>
                                <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14}/>
                            </div>
                        </div>
                    </div>

                    {/* Campaign List */}
                    {filteredCampaigns.length === 0 ? (
                        <div className="text-center py-10 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                            {manageSearch ? "No campaigns match your search." : "No campaigns created yet."}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredCampaigns.map(task => (
                                <GlassCard key={task.id} className="relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-bold text-white flex items-center gap-2">
                                                {task.title}
                                                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded uppercase">{task.category}</span>
                                            </h3>
                                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{task.target_url}</p>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${task.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {task.status}
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        <div className="bg-white/5 p-2 rounded text-center">
                                            <p className="text-[9px] text-gray-500 uppercase">Progress</p>
                                            <p className="text-sm font-bold text-white">
                                                {task.total_quantity - task.remaining_quantity}/{task.total_quantity}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded text-center">
                                            <p className="text-[9px] text-gray-500 uppercase">Cost/Act</p>
                                            <p className="text-sm font-bold text-white">${task.price_per_action}</p>
                                        </div>
                                        <div className="bg-white/5 p-2 rounded text-center">
                                            <p className="text-[9px] text-gray-500 uppercase">Timer</p>
                                            <p className="text-sm font-bold text-purple-400">{task.timer_seconds || 0}s</p>
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleToggleStatus(task)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${task.status === 'active' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}
                                        >
                                            {task.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                                        </button>
                                    </div>
                                </GlassCard>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        )}

    </div>
  );
};

export default Advertise;
