
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import SmartImage from '../components/SmartImage';
import { supabase } from '../integrations/supabase/client';
import { WalletData, Asset, UserAsset } from '../types';
import { buyAsset, sellAsset } from '../lib/actions';
import { TrendingUp, Briefcase, Coins, PieChart, ArrowUpRight, DollarSign, RefreshCw, Loader2 } from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';

const Invest: React.FC = () => {
    const { toast, confirm } = useUI();
    const [wallet, setWallet] = useState<WalletData | null>(null);
    const [activeTab, setActiveTab] = useState<'commodity' | 'business' | 'portfolio'>('commodity');
    
    const [assets, setAssets] = useState<Asset[]>([]);
    const [portfolio, setPortfolio] = useState<UserAsset[]>([]);
    const [loading, setLoading] = useState(true);

    // Trade Modal
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
    const [amount, setAmount] = useState('');
    const [mode, setMode] = useState<'buy' | 'sell'>('buy');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(simulateMarket, 5000); // Live price updates
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const [wRes, aRes, pRes] = await Promise.all([
                supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
                supabase.from('assets').select('*').eq('is_active', true),
                supabase.from('user_assets').select('*, assets(*)').eq('user_id', session.user.id)
            ]);
            
            if (wRes.data) setWallet(wRes.data as WalletData);
            if (aRes.data) setAssets(aRes.data as Asset[]);
            if (pRes.data) setPortfolio(pRes.data as any);
        }
        setLoading(false);
    };

    const simulateMarket = () => {
        setAssets(prev => prev.map(a => {
            if (a.type === 'business') return a; // Businesses have fixed price usually
            const change = (Math.random() - 0.5) * (a.current_price * 0.005);
            return { ...a, current_price: parseFloat((a.current_price + change).toFixed(2)) };
        }));
    };

    const handleTransaction = async () => {
        if (!selectedAsset || !wallet) return;
        const qty = parseFloat(amount);
        if (qty <= 0) { toast.error("Invalid quantity"); return; }
        
        setProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            if (mode === 'buy') {
                const cost = qty * selectedAsset.current_price;
                if (wallet.deposit_balance < cost) {
                    toast.error(`Insufficient Deposit Balance. Cost: ৳${cost.toFixed(2)}`);
                    return;
                }
                if (!await confirm(`Buy ${qty} ${selectedAsset.name} for ৳${cost.toFixed(2)}?`)) return;

                await buyAsset(session.user.id, selectedAsset, qty, cost);
                toast.success("Asset Purchased!");
            } else {
                const holding = portfolio.find(p => p.asset_id === selectedAsset.id);
                if (!holding || holding.quantity < qty) {
                    toast.error("Insufficient holdings.");
                    return;
                }
                const revenue = qty * selectedAsset.current_price;
                if (!await confirm(`Sell ${qty} ${selectedAsset.name} for ৳${revenue.toFixed(2)}?`)) return;

                await sellAsset(session.user.id, holding.id, qty, selectedAsset.current_price);
                toast.success("Asset Sold! Funds in Main Wallet.");
            }
            
            setSelectedAsset(null);
            setAmount('');
            fetchData();
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const filteredAssets = assets.filter(a => {
        if (activeTab === 'commodity') return a.type === 'commodity' || a.type === 'currency';
        if (activeTab === 'business') return a.type === 'business';
        return false;
    });

    if (loading) return <Loader />;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0 animate-fade-in">
            <header className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-2">
                        <TrendingUp className="text-green-500" /> Trading Hub
                    </h1>
                    <p className="text-gray-400 text-xs">Marketplace for Assets & Commodities</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase">Liquid Funds</p>
                    <p className="text-white font-mono font-bold"><BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true} /></p>
                </div>
            </header>

            {/* TABS */}
            <div className="flex bg-[#111] p-1 rounded-xl border border-[#222]">
                <button onClick={() => setActiveTab('commodity')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'commodity' ? 'bg-[#222] text-white shadow' : 'text-gray-500'}`}>Commodities</button>
                <button onClick={() => setActiveTab('business')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'business' ? 'bg-[#222] text-white shadow' : 'text-gray-500'}`}>Business</button>
                <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'portfolio' ? 'bg-[#222] text-white shadow' : 'text-gray-500'}`}>My Portfolio</button>
            </div>

            {/* AD */}
            <GoogleAd slot="3493119845" layout="in-article" />

            {/* LIST */}
            {activeTab === 'portfolio' ? (
                <div className="space-y-3">
                    {portfolio.length === 0 && <p className="text-center text-gray-500 py-10">No assets owned.</p>}
                    {portfolio.map(item => {
                        // @ts-ignore
                        const asset = item.assets;
                        const curVal = item.quantity * asset.current_price;
                        const pnl = curVal - (item.quantity * item.average_buy_price);
                        
                        return (
                            <GlassCard key={item.id} className="border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-lg overflow-hidden">
                                            {asset.image_url ? <img src={asset.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{asset.name[0]}</div>}
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-sm">{asset.name}</h4>
                                            <p className="text-gray-500 text-xs">{item.quantity} Units</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold font-mono">৳{curVal.toFixed(2)}</p>
                                        <p className={`text-xs font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pnl >= 0 ? '+' : ''}৳{pnl.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => { setSelectedAsset(asset); setMode('buy'); }} className="flex-1 py-2 bg-green-500/10 text-green-400 rounded text-xs font-bold border border-green-500/20">Buy More</button>
                                    <button onClick={() => { setSelectedAsset(asset); setMode('sell'); }} className="flex-1 py-2 bg-red-500/10 text-red-400 rounded text-xs font-bold border border-red-500/20">Sell</button>
                                </div>
                            </GlassCard>
                        );
                    })}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {filteredAssets.map(asset => (
                        <GlassCard key={asset.id} className="relative overflow-hidden group hover:border-green-500/30 transition border-white/10" onClick={() => { setSelectedAsset(asset); setMode('buy'); }}>
                            <div className="flex justify-between items-start mb-2">
                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white border border-white/10">
                                    {asset.image_url ? <img src={asset.image_url} className="w-full h-full object-cover rounded-full"/> : asset.name[0]}
                                </div>
                                {asset.type !== 'business' && (
                                    <div className="h-6 w-12 opacity-50">
                                         <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={[{v: asset.current_price*0.9}, {v: asset.current_price*1.1}, {v: asset.current_price}]}>
                                                <Area type="monotone" dataKey="v" stroke="#4ade80" strokeWidth={2} fill="none" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                            <h4 className="text-white font-bold text-sm truncate">{asset.name}</h4>
                            <p className="text-green-400 font-mono font-bold text-lg mt-1">৳{asset.current_price.toFixed(2)}</p>
                            
                            {asset.type === 'business' && (
                                <div className="mt-2 text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded">
                                    ROI: {asset.profit_rate}% / {asset.duration_days} Days
                                </div>
                            )}
                        </GlassCard>
                    ))}
                </div>
            )}

            {/* Trade Modal */}
            <AnimatePresence>
                {selectedAsset && (
                    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-[#111] w-full max-w-sm rounded-2xl border border-white/10 p-6">
                            <h3 className="text-xl font-bold text-white mb-4">{mode === 'buy' ? 'Buy' : 'Sell'} {selectedAsset.name}</h3>
                            
                            <div className="bg-black/40 p-4 rounded-xl mb-4 border border-white/5">
                                <p className="text-gray-500 text-xs uppercase font-bold">Current Price</p>
                                <p className="text-2xl font-mono text-white font-bold">৳{selectedAsset.current_price}</p>
                            </div>

                            <div className="space-y-2 mb-6">
                                <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-green-500 outline-none font-mono" placeholder="0" />
                                <p className="text-right text-xs text-gray-400">Total: ৳{((parseFloat(amount)||0) * selectedAsset.current_price).toFixed(2)}</p>
                            </div>

                            <div className="flex gap-3">
                                <button onClick={() => setSelectedAsset(null)} className="flex-1 py-3 bg-white/5 text-white rounded-xl font-bold text-xs">Cancel</button>
                                <button onClick={handleTransaction} disabled={processing} className="flex-1 py-3 bg-green-500 text-black rounded-xl font-bold text-xs flex items-center justify-center gap-2">
                                    {processing ? <Loader2 className="animate-spin"/> : 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Invest;
