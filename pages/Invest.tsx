import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import SmartImage from '../components/SmartImage';
import { supabase } from '../integrations/supabase/client';
import { WalletData, Asset, UserAsset } from '../types';
import { buyAsset, sellAsset, requestDelivery } from '../lib/actions';
import { 
    TrendingUp, TrendingDown, DollarSign, Box, Truck, 
    ArrowRight, Loader2, Info, Briefcase, Coins, 
    BarChart3, RefreshCw, PieChart, ArrowLeftRight, CheckCircle2, Wallet, Clock
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts';
import Loader from '../components/Loader';
import GoogleAd from '../components/GoogleAd';

const Invest: React.FC = () => {
  const { toast, confirm } = useUI();
  const [activeTab, setActiveTab] = useState<'commodity' | 'currency' | 'business' | 'portfolio'>('commodity');
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolio, setPortfolio] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  
  // Transaction State
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [amount, setAmount] = useState('');
  const [txMode, setTxMode] = useState<'buy' | 'sell'>('buy');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchData();
    // Simulate price updates
    const interval = setInterval(simulateMarket, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        setUserId(session.user.id);
        const [wRes, aRes, pRes] = await Promise.all([
            supabase.from('wallets').select('*').eq('user_id', session.user.id).single(),
            supabase.from('assets').select('*').eq('is_active', true),
            supabase.from('user_assets').select('*, assets(*)').eq('user_id', session.user.id).eq('status', 'holding')
        ]);

        if(wRes.data) setWallet(wRes.data as WalletData);
        if(aRes.data) setAssets(aRes.data as Asset[]);
        if(pRes.data) setPortfolio(pRes.data as any);
    }
    setLoading(false);
  };

  const simulateMarket = () => {
      setAssets(prev => prev.map(a => {
          if (a.type === 'business') return a; // Business prices don't fluctuate randomly
          const change = (Math.random() - 0.5) * (a.current_price * 0.005); // 0.5% fluctuation
          return {
              ...a,
              previous_price: a.current_price,
              current_price: parseFloat((a.current_price + change).toFixed(2))
          };
      }));
  };

  const handleOpenModal = (asset: Asset, mode: 'buy' | 'sell' = 'buy') => {
      setSelectedAsset(asset);
      setTxMode(mode);
      setAmount('');
  };

  const handleTransaction = async () => {
      if (!selectedAsset || !wallet) return;
      
      const qty = parseFloat(amount);
      if (isNaN(qty) || qty <= 0) { toast.error("Invalid quantity"); return; }

      setIsProcessing(true);
      try {
          if (txMode === 'buy') {
              const totalCost = qty * selectedAsset.current_price;
              
              if (wallet.deposit_balance < totalCost) {
                  toast.error(`Insufficient Deposit Balance. Need ৳${totalCost.toFixed(2)}`);
                  setIsProcessing(false);
                  return;
              }

              if (selectedAsset.type === 'business') {
                  const remaining = (selectedAsset.target_fund || 0) - (selectedAsset.collected_fund || 0);
                  const investAmount = qty * selectedAsset.current_price; 
                  if (investAmount > remaining) {
                      toast.error("Investment exceeds remaining target fund.");
                      setIsProcessing(false);
                      return;
                  }
              }

              if (!await confirm(`Confirm Buy? \n${qty} ${selectedAsset.name} for ৳${totalCost.toFixed(2)}`)) {
                  setIsProcessing(false);
                  return;
              }

              await buyAsset(userId, selectedAsset, qty, totalCost);
              toast.success("Asset Purchased Successfully!");

          } else if (txMode === 'sell') {
              // Find holding
              const holding = portfolio.find(p => p.asset_id === selectedAsset.id);
              if (!holding || holding.quantity < qty) {
                  toast.error("Insufficient holdings to sell.");
                  setIsProcessing(false);
                  return;
              }

              const totalReceive = qty * selectedAsset.current_price;
              
              if (!await confirm(`Confirm Sell? \n${qty} ${selectedAsset.name} for ৳${totalReceive.toFixed(2)}`)) {
                  setIsProcessing(false);
                  return;
              }

              await sellAsset(userId, holding.id, qty, selectedAsset.current_price);
              toast.success("Asset Sold! Funds added to Main Balance.");
          }

          setAmount('');
          setSelectedAsset(null);
          fetchData(); // Refresh all data

      } catch (e: any) {
          toast.error(e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDelivery = async (holdingId: string) => {
      if (!deliveryAddress || deliveryAddress.length < 10) {
          toast.error("Please enter a valid delivery address.");
          return;
      }
      if (!await confirm("Request Delivery? This will remove the asset from your digital portfolio.")) return;

      try {
          await requestDelivery(userId, holdingId, deliveryAddress);
          toast.success("Delivery Requested. Admin will contact you.");
          setDeliveryAddress('');
          fetchData();
      } catch (e: any) {
          toast.error(e.message);
      }
  };

  // Helper to get holding qty for an asset
  const getHoldingQty = (assetId: string) => {
      const holding = portfolio.find(p => p.asset_id === assetId);
      return holding ? holding.quantity : 0;
  };

  // Helper to set quick amounts
  const setQuickAmount = (percent: number) => {
      if(!selectedAsset || !wallet) return;
      if (txMode === 'buy') {
          const maxAfford = wallet.deposit_balance / selectedAsset.current_price;
          setAmount((maxAfford * percent).toFixed(2));
      } else {
          const holding = getHoldingQty(selectedAsset.id);
          setAmount((holding * percent).toFixed(2));
      }
  };

  const filteredAssets = assets.filter(a => a.type === activeTab);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader /></div>;

  return (
    <div className="pb-24 sm:pl-20 sm:pt-6 space-y-6 px-4 sm:px-0">
        
        {/* Header */}
        <div className="flex flex-col gap-4">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="text-neon-green" /> Market
                    </h1>
                    <p className="text-gray-400 text-sm">Trade Commodities, Forex & Business Shares.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold">Investable (Deposit)</p>
                    <p className="text-white font-mono font-bold text-lg"><BalanceDisplay amount={wallet?.deposit_balance || 0} isNative={true}/></p>
                </div>
            </div>

            {/* Navigation Pills */}
            <div className="flex bg-[#111] p-1 rounded-xl border border-[#222] overflow-x-auto no-scrollbar">
                {[
                    { id: 'commodity', label: 'Commodities', icon: Coins },
                    { id: 'currency', label: 'Forex', icon: DollarSign },
                    { id: 'business', label: 'Business', icon: Briefcase },
                    { id: 'portfolio', label: 'My Portfolio', icon: PieChart }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setSelectedAsset(null); }}
                        className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
                            activeTab === tab.id 
                            ? 'bg-[#222] text-white shadow-sm border border-[#333]' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* AD PLACEMENT: IN-ARTICLE */}
        <GoogleAd slot="3493119845" layout="in-article" />

        {/* --- PORTFOLIO VIEW --- */}
        {activeTab === 'portfolio' ? (
            <div className="space-y-4">
                {portfolio.length === 0 ? (
                    <div className="text-center py-16 bg-[#111] rounded-2xl border border-[#222] text-gray-500 flex flex-col items-center">
                        <Box size={40} className="mb-4 opacity-30"/>
                        <p className="font-bold text-gray-400">Empty Portfolio</p>
                        <p className="text-xs mt-1">Start investing to build your wealth.</p>
                        <button onClick={() => setActiveTab('commodity')} className="mt-4 px-6 py-2 bg-white/10 rounded-lg text-white text-xs font-bold hover:bg-white/20 transition">Browse Market</button>
                    </div>
                ) : (
                    portfolio.map(item => {
                        // @ts-ignore
                        const asset = item.assets as Asset;
                        const currentValue = item.quantity * asset.current_price;
                        const buyValue = item.quantity * item.average_buy_price;
                        const pnl = currentValue - buyValue;
                        const pnlPercent = (pnl / buyValue) * 100;

                        return (
                            <GlassCard key={item.id} className="border border-[#222] hover:border-white/10 transition group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        {asset.image_url ? (
                                            <SmartImage src={asset.image_url} className="w-12 h-12 object-contain rounded-xl bg-white/5 p-1 border border-white/5" />
                                        ) : (
                                            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center font-bold text-white border border-white/5">
                                                {asset.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-white">{asset.name}</h3>
                                            <p className="text-xs text-gray-400 font-medium">
                                                {item.quantity} {asset.type === 'business' ? 'Units' : (asset.type === 'currency' ? '$' : 'g')}
                                                <span className="mx-1 text-gray-600">•</span>
                                                Avg: ৳{item.average_buy_price.toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold font-mono text-lg">৳{currentValue.toFixed(2)}</p>
                                        <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pnl >= 0 ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 border-t border-white/5 pt-3">
                                    <button 
                                        onClick={() => handleOpenModal(asset, 'buy')}
                                        className="flex-1 py-2 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg text-xs font-bold hover:bg-green-500/20 transition flex items-center justify-center gap-1"
                                    >
                                        <ArrowLeftRight size={12}/> Buy More
                                    </button>
                                    <button 
                                        onClick={() => handleOpenModal(asset, 'sell')}
                                        className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition flex items-center justify-center gap-1"
                                    >
                                        <DollarSign size={12}/> Sell
                                    </button>
                                    {asset.type === 'commodity' && (
                                        <div className="relative group/delivery">
                                            <button 
                                                onClick={() => {
                                                    const addr = prompt("Enter Physical Delivery Address:");
                                                    if(addr) { setDeliveryAddress(addr); handleDelivery(item.id); }
                                                }}
                                                className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold hover:bg-blue-500/20 transition flex items-center justify-center gap-1"
                                                title="Request Delivery"
                                            >
                                                <Truck size={14}/>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </GlassCard>
                        );
                    })
                )}
            </div>
        ) : (
            // --- MARKET VIEW ---
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
                {filteredAssets.map(asset => {
                    const priceChange = asset.previous_price ? ((asset.current_price - asset.previous_price) / asset.previous_price) * 100 : 0;
                    const isUp = priceChange >= 0;

                    if (asset.type === 'business') {
                        // Business Card Layout
                        const progress = asset.target_fund ? ((asset.collected_fund || 0) / asset.target_fund) * 100 : 0;
                        return (
                            <GlassCard key={asset.id} className="border border-[#222] group hover:border-white/20 transition overflow-hidden">
                                <div className="h-32 w-full bg-black/50 rounded-lg mb-4 overflow-hidden relative border border-white/5">
                                    <SmartImage src={asset.image_url || 'https://via.placeholder.com/300x150'} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-500" />
                                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-neon-green border border-neon-green/30 shadow-lg">
                                        {asset.profit_rate}% ROI
                                    </div>
                                    <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-white border border-white/10 flex items-center gap-1">
                                        <Clock size={10} className="text-blue-400"/> {asset.duration_days} Days
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-white font-bold text-base truncate pr-2">{asset.name}</h3>
                                    <span className="text-white font-mono font-bold text-sm bg-white/5 px-2 py-0.5 rounded border border-white/5">৳{asset.current_price}</span>
                                </div>
                                <p className="text-[11px] text-gray-400 mb-4 line-clamp-2 h-8 leading-snug">{asset.description}</p>
                                
                                <div className="space-y-1 mb-4">
                                    <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase">
                                        <span>Funded</span>
                                        <span>{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-1.5 bg-[#111] rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500" style={{width: `${progress}%`}}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-gray-500 pt-1">
                                        <span>৳{asset.collected_fund?.toLocaleString()}</span>
                                        <span>Target: ৳{asset.target_fund?.toLocaleString()}</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => handleOpenModal(asset)}
                                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                                >
                                    Invest Now <ArrowRight size={14}/>
                                </button>
                            </GlassCard>
                        );
                    }

                    // Commodity/Forex Card Layout
                    return (
                        <GlassCard key={asset.id} className="border border-[#222] hover:border-white/10 transition">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center p-2 border border-white/5 shrink-0">
                                        <SmartImage src={asset.image_url} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-sm">{asset.name}</h3>
                                        <p className="text-[10px] text-gray-500 font-medium">Global Market</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Live Price</p>
                                    <p className="text-lg font-mono font-bold text-white">৳{asset.current_price.toFixed(2)}</p>
                                    <div className={`flex items-center justify-end gap-1 text-[10px] font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                        {isUp ? <TrendingUp size={10}/> : <TrendingDown size={10}/>}
                                        {Math.abs(priceChange).toFixed(2)}%
                                    </div>
                                </div>
                            </div>

                            {/* Mini Chart Area */}
                            <div className="h-16 w-full mb-4 opacity-50 relative pointer-events-none">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        {v: asset.current_price * (1 - (Math.random() * 0.05))}, 
                                        {v: asset.current_price * (1 + (Math.random() * 0.03))}, 
                                        {v: asset.current_price * (1 - (Math.random() * 0.02))}, 
                                        {v: asset.current_price * 1.01}, 
                                        {v: asset.current_price}
                                    ]}>
                                        <defs>
                                            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor={isUp ? "#4ade80" : "#f87171"} stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <YAxis domain={['auto', 'auto']} hide />
                                        <Area type="monotone" dataKey="v" stroke={isUp ? "#4ade80" : "#f87171"} strokeWidth={2} fill="url(#colorPrice)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleOpenModal(asset, 'buy')}
                                    className="flex-1 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition text-xs uppercase"
                                >
                                    Trade
                                </button>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        )}

        {/* Transaction Modal */}
        <AnimatePresence>
            {selectedAsset && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}>
                    <motion.div 
                        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                        className="bg-[#111] w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 p-6 shadow-2xl relative overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header Image Background */}
                        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>
                        
                        <div className="relative z-10">
                            {/* Toggle Type */}
                            <div className="flex bg-[#000] p-1 rounded-xl border border-[#222] mb-6">
                                <button 
                                    onClick={() => setTxMode('buy')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${txMode === 'buy' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500'}`}
                                >
                                    Buy {selectedAsset.name}
                                </button>
                                <button 
                                    onClick={() => setTxMode('sell')}
                                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${txMode === 'sell' ? 'bg-red-600 text-white shadow-lg' : 'text-gray-500'}`}
                                >
                                    Sell
                                </button>
                            </div>

                            <div className="text-center mb-6">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Current Price</p>
                                <h3 className="text-3xl font-mono font-black text-white">৳{selectedAsset.current_price.toFixed(2)}</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="flex justify-between text-xs text-gray-500 font-bold uppercase mb-2">
                                        <span>Quantity</span>
                                        <span>Available: ৳{wallet?.deposit_balance.toFixed(2)}</span>
                                    </label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            autoFocus
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            className="w-full bg-[#0a0a0a] border border-[#222] rounded-xl p-4 text-white font-bold text-lg focus:border-white outline-none font-mono text-center"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        {[0.25, 0.5, 1].map(p => (
                                            <button 
                                                key={p} 
                                                onClick={() => setQuickAmount(p)}
                                                className="flex-1 py-1.5 bg-[#222] text-gray-400 rounded-lg text-[10px] font-bold hover:bg-[#333] hover:text-white transition"
                                            >
                                                {p === 1 ? 'MAX' : `${p*100}%`}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Summary Box */}
                                <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-gray-400">Total Value</span>
                                        <span className={`font-mono font-bold ${txMode === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                                            ৳{((parseFloat(amount) || 0) * selectedAsset.current_price).toFixed(2)}
                                        </span>
                                    </div>
                                    {selectedAsset.type === 'business' && txMode === 'buy' && (
                                        <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5">
                                            <span className="text-purple-400">Proj. Return</span>
                                            <span className="font-mono font-bold text-purple-400">
                                                ৳{((parseFloat(amount) || 0) * selectedAsset.current_price * (1 + (selectedAsset.profit_rate || 0)/100)).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button 
                                    onClick={handleTransaction}
                                    disabled={isProcessing || !amount}
                                    className={`w-full py-4 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all ${
                                        txMode === 'buy' 
                                        ? 'bg-green-500 text-black shadow-green-900/30' 
                                        : 'bg-red-500 text-white shadow-red-900/30'
                                    }`}
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" /> : `Confirm ${txMode}`}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Invest;