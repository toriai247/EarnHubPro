
import React, { useEffect, useState, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { WalletData, Asset, UserAsset } from '../types';
import { buyAsset, sellAsset } from '../lib/actions';
import { 
    TrendingUp, Briefcase, PieChart, ArrowUpRight, ArrowDownRight, 
    DollarSign, Loader2, Activity, Building2, Package, X, CheckCircle2 
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import Loader from '../components/Loader';
import { motion, AnimatePresence } from 'framer-motion';
import GoogleAd from '../components/GoogleAd';
import { useCurrency } from '../context/CurrencyContext';

const Invest: React.FC = () => {
    const { toast, confirm } = useUI();
    const { format } = useCurrency();
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

    // Chart Data Cache (Fake history for visual appeal)
    const [chartHistory, setChartHistory] = useState<Record<string, any[]>>({});

    useEffect(() => {
        fetchData();
        const interval = setInterval(simulateMarket, 3000); // Faster updates for "Live" feel
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
            
            if (aRes.data) {
                // Initialize charts
                const history: Record<string, any[]> = {};
                aRes.data.forEach((a: Asset) => {
                    history[a.id] = Array.from({ length: 15 }, () => ({
                        value: a.current_price * (0.95 + Math.random() * 0.1)
                    }));
                });
                setChartHistory(history);
                setAssets(aRes.data as Asset[]);
            }

            if (pRes.data) setPortfolio(pRes.data as any);
        }
        setLoading(false);
    };

    const simulateMarket = () => {
        setAssets(prev => prev.map(a => {
            if (a.type === 'business') return a; // Businesses are stable
            
            const volatility = 0.008; // 0.8% variance
            const change = (Math.random() - 0.5) * (a.current_price * volatility);
            const newPrice = Math.max(0.1, parseFloat((a.current_price + change).toFixed(2)));
            
            // Update chart history
            setChartHistory(prevHistory => {
                const oldData = prevHistory[a.id] || [];
                const newData = [...oldData.slice(1), { value: newPrice }];
                return { ...prevHistory, [a.id]: newData };
            });

            return { 
                ...a, 
                current_price: newPrice,
                previous_price: a.current_price 
            };
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
                    toast.error(`Insufficient Deposit Balance. Need ${format(cost)}`);
                    return;
                }
                
                await buyAsset(session.user.id, selectedAsset, qty, cost);
                toast.success(`Successfully bought ${qty} ${selectedAsset.name}`);
                
                // Optimistic Update
                setWallet({ ...wallet, deposit_balance: wallet.deposit_balance - cost });
            } else {
                const holding = portfolio.find(p => p.asset_id === selectedAsset.id);
                if (!holding || holding.quantity < qty) {
                    toast.error("Insufficient holdings.");
                    return;
                }
                
                const revenue = qty * selectedAsset.current_price;
                await sellAsset(session.user.id, holding.id, qty, selectedAsset.current_price);
                toast.success(`Sold! ${format(revenue)} added to Main Wallet`);
                
                // Optimistic Update
                setWallet({ ...wallet, main_balance: wallet.main_balance + revenue });
            }
            
            setSelectedAsset(null);
            setAmount('');
            // Refetch portfolio to ensure sync
            const { data } = await supabase.from('user_assets').select('*, assets(*)').eq('user_id', session.user.id);
            if(data) setPortfolio(data as any);

        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setProcessing(false);
        }
    };

    const handleMax = () => {
        if (!selectedAsset || !wallet) return;
        if (mode === 'buy') {
            const maxBuy = Math.floor(wallet.deposit_balance / selectedAsset.current_price);
            setAmount(maxBuy.toString());
        } else {
            const holding = portfolio.find(p => p.asset_id === selectedAsset.id);
            if (holding) setAmount(holding.quantity.toString());
        }
    };

    const filteredAssets = assets.filter(a => {
        if (activeTab === 'commodity') return a.type === 'commodity' || a.type === 'currency';
        if (activeTab === 'business') return a.type === 'business';
        return false;
    });

    // --- SUB-COMPONENTS ---
    const TabButton = ({ id, label, icon: Icon }: any) => (
        <button 
            onClick={() => setActiveTab(id)} 
            className={`flex-1 relative py-3 rounded-xl text-xs font-bold uppercase transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === id ? 'text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >
            {activeTab === id && (
                <motion.div 
                    layoutId="activeTab"
                    className="absolute inset-0 bg-[#222] rounded-xl border border-white/10 shadow-lg"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
            )}
            <span className="relative z-10 flex items-center gap-2">
                <Icon size={14} /> {label}
            </span>
        </button>
    );

    if (loading) return <Loader />;

    return (
        <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
            
            {/* Header */}
            <div className="flex justify-between items-end pt-4">
                <div>
                    <h1 className="text-3xl font-display font-black text-white flex items-center gap-2">
                        <TrendingUp className="text-green-500" /> Market
                    </h1>
                    <p className="text-gray-400 text-xs mt-1">Live Asset Trading & Portfolio</p>
                </div>
                <div className="bg-[#111] border border-white/10 px-4 py-2 rounded-xl text-right">
                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Trading Power</p>
                    <p className="text-white font-mono font-bold text-lg">
                        <BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true} />
                    </p>
                </div>
            </div>

            {/* Navigation */}
            <div className="bg-[#111] p-1.5 rounded-2xl border border-white/5 flex relative z-0">
                <TabButton id="commodity" label="Assets" icon={Package} />
                <TabButton id="business" label="Ventures" icon={Building2} />
                <TabButton id="portfolio" label="My Portfolio" icon={PieChart} />
            </div>

            {/* AD */}
            <GoogleAd slot="3493119845" layout="in-article" />

            {/* --- LISTINGS --- */}
            <AnimatePresence mode='popLayout'>
                <motion.div 
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                >
                    {activeTab === 'portfolio' ? (
                         portfolio.length === 0 ? (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PieChart size={32} className="text-gray-600" />
                                </div>
                                <p className="text-gray-500 text-sm">Your portfolio is empty.</p>
                                <button onClick={() => setActiveTab('commodity')} className="mt-4 text-green-400 text-xs font-bold hover:underline">Start Trading</button>
                            </div>
                        ) : (
                            portfolio.map((item) => {
                                // @ts-ignore
                                const asset = item.assets;
                                const curVal = item.quantity * asset.current_price;
                                const pnl = curVal - (item.quantity * item.average_buy_price);
                                const pnlPercent = ((pnl / (item.quantity * item.average_buy_price)) * 100);

                                return (
                                    <GlassCard key={item.id} className="border-l-4 border-l-blue-500 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition"><Package size={80}/></div>
                                        
                                        <div className="flex justify-between items-start mb-4 relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-white/10 rounded-lg overflow-hidden border border-white/10">
                                                    {asset.image_url ? <img src={asset.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white">{asset.name[0]}</div>}
                                                </div>
                                                <div>
                                                    <h4 className="text-white font-bold text-sm">{asset.name}</h4>
                                                    <p className="text-gray-500 text-xs font-mono">{item.quantity} Units</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-white font-bold font-mono text-lg"><BalanceDisplay amount={curVal} /></p>
                                                <div className={`text-[10px] font-bold px-1.5 rounded inline-flex items-center gap-1 ${pnl >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                                    {pnl >= 0 ? <ArrowUpRight size={10}/> : <ArrowDownRight size={10}/>}
                                                    {pnlPercent.toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 relative z-10">
                                            <button 
                                                onClick={() => { setSelectedAsset(asset); setMode('buy'); }} 
                                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-white border border-white/10 transition"
                                            >
                                                Buy More
                                            </button>
                                            <button 
                                                onClick={() => { setSelectedAsset(asset); setMode('sell'); }} 
                                                className="flex-1 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-xs font-bold border border-red-500/20 transition"
                                            >
                                                Sell
                                            </button>
                                        </div>
                                    </GlassCard>
                                );
                            })
                        )
                    ) : (
                        filteredAssets.map(asset => {
                            const priceChange = asset.previous_price ? ((asset.current_price - asset.previous_price) / asset.previous_price) * 100 : 0;
                            const isUp = priceChange >= 0;
                            const chartData = chartHistory[asset.id] || [];

                            return (
                                <GlassCard 
                                    key={asset.id} 
                                    className="relative overflow-hidden group hover:border-white/20 transition-all cursor-pointer"
                                    onClick={() => { setSelectedAsset(asset); setMode('buy'); }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xs font-bold text-white border border-white/10 p-1">
                                                {asset.image_url ? <img src={asset.image_url} className="w-full h-full object-contain"/> : asset.name[0]}
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold text-sm">{asset.name}</h4>
                                                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${asset.type === 'business' ? 'bg-purple-500/20 text-purple-300' : 'bg-blue-500/20 text-blue-300'}`}>
                                                    {asset.type}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {asset.type !== 'business' && (
                                            <div className="h-10 w-20 opacity-70">
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <AreaChart data={chartData}>
                                                        <defs>
                                                            <linearGradient id={`grad-${asset.id}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={isUp ? "#4ade80" : "#ef4444"} stopOpacity={0.3}/>
                                                                <stop offset="95%" stopColor={isUp ? "#4ade80" : "#ef4444"} stopOpacity={0}/>
                                                            </linearGradient>
                                                        </defs>
                                                        <Area 
                                                            type="monotone" 
                                                            dataKey="value" 
                                                            stroke={isUp ? "#4ade80" : "#ef4444"} 
                                                            strokeWidth={2} 
                                                            fill={`url(#grad-${asset.id})`} 
                                                            isAnimationActive={false}
                                                        />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-0.5">Live Price</p>
                                            <motion.p 
                                                key={asset.current_price}
                                                initial={{ scale: 1.1, color: isUp ? '#4ade80' : '#ef4444' }}
                                                animate={{ scale: 1, color: '#ffffff' }}
                                                className="text-lg font-mono font-black tracking-tight"
                                            >
                                                {format(asset.current_price, { isNative: false })}
                                            </motion.p>
                                        </div>
                                        {asset.type === 'business' ? (
                                            <div className="text-right">
                                                <p className="text-[10px] text-gray-500 uppercase font-bold">ROI</p>
                                                <p className="text-purple-400 font-bold text-sm">{asset.profit_rate}% / {asset.duration_days}D</p>
                                            </div>
                                        ) : (
                                            <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? 'text-green-500' : 'text-red-500'}`}>
                                                {isUp ? <ArrowUpRight size={14}/> : <ArrowDownRight size={14}/>}
                                                {Math.abs(priceChange).toFixed(2)}%
                                            </div>
                                        )}
                                    </div>
                                </GlassCard>
                            );
                        })
                    )}
                </motion.div>
            </AnimatePresence>

            {/* --- TRADE MODAL --- */}
            <AnimatePresence>
                {selectedAsset && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                            onClick={() => setSelectedAsset(null)}
                        />
                        <motion.div 
                            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                            className="bg-[#111] w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl relative z-10"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        {mode === 'buy' ? 'Buy' : 'Sell'} <span className={mode === 'buy' ? 'text-green-400' : 'text-red-400'}>{selectedAsset.name}</span>
                                    </h3>
                                    <p className="text-xs text-gray-400 font-mono">Current: {format(selectedAsset.current_price, { isNative: false })}</p>
                                </div>
                                <button onClick={() => setSelectedAsset(null)} className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white"><X size={20}/></button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold text-gray-500 uppercase mb-1.5">
                                        <span>Quantity</span>
                                        <span onClick={handleMax} className="text-blue-400 cursor-pointer hover:text-white">Max Available</span>
                                    </div>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={amount} 
                                            onChange={e => setAmount(e.target.value)} 
                                            className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white text-lg font-mono focus:border-white/30 outline-none" 
                                            placeholder="0.00" 
                                            autoFocus
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-xs uppercase">Units</span>
                                    </div>
                                </div>
                                
                                {/* Quick Buttons */}
                                <div className="flex gap-2">
                                    {[0.25, 0.5, 0.75, 1].map(pct => (
                                        <button 
                                            key={pct}
                                            onClick={() => {
                                                if (mode === 'buy' && wallet) {
                                                    const max = wallet.deposit_balance / selectedAsset.current_price;
                                                    setAmount((max * pct).toFixed(4));
                                                } else {
                                                    const holding = portfolio.find(p => p.asset_id === selectedAsset.id);
                                                    if(holding) setAmount((holding.quantity * pct).toFixed(4));
                                                }
                                            }}
                                            className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition"
                                        >
                                            {pct * 100}%
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-white/5 p-4 rounded-xl flex justify-between items-center border border-white/5">
                                    <span className="text-sm text-gray-400 font-medium">Total Value</span>
                                    <span className="text-xl font-bold text-white font-mono">
                                        {format((parseFloat(amount) || 0) * selectedAsset.current_price, { isNative: false })}
                                    </span>
                                </div>

                                <button 
                                    onClick={handleTransaction} 
                                    disabled={processing} 
                                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg transition transform active:scale-95 ${
                                        mode === 'buy' 
                                        ? 'bg-green-500 text-black hover:bg-green-400 shadow-green-900/20' 
                                        : 'bg-red-500 text-white hover:bg-red-600 shadow-red-900/20'
                                    }`}
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : (mode === 'buy' ? 'Confirm Purchase' : 'Confirm Sale')}
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
