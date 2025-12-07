
import React, { useEffect, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { supabase } from '../integrations/supabase/client';
import { WalletData, Asset, UserAsset } from '../types';
import { updateWallet, createTransaction, buyAsset, sellAsset, requestDelivery } from '../lib/actions';
import { 
    TrendingUp, TrendingDown, DollarSign, Box, Truck, 
    ArrowRight, Loader2, Info, Briefcase, Coins, 
    BarChart3, RefreshCw 
} from 'lucide-react';
import { useUI } from '../context/UIContext';
import BalanceDisplay from '../components/BalanceDisplay';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import Loader from '../components/Loader';

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
                  const investAmount = qty * selectedAsset.current_price; // Quantity is units
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
                    <p className="text-white font-mono font-bold text-lg">৳{wallet?.deposit_balance.toFixed(2)}</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex bg-[#111] p-1 rounded-xl border border-[#222] overflow-x-auto no-scrollbar">
                {[
                    { id: 'commodity', label: 'Gold & Silver', icon: Coins },
                    { id: 'currency', label: 'Forex (USD)', icon: DollarSign },
                    { id: 'business', label: 'Business', icon: Briefcase },
                    { id: 'portfolio', label: 'My Portfolio', icon: Box }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setSelectedAsset(null); }}
                        className={`flex-1 min-w-[100px] py-2.5 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-2 ${
                            activeTab === tab.id 
                            ? 'bg-[#222] text-white shadow-sm' 
                            : 'text-gray-500 hover:text-white'
                        }`}
                    >
                        <tab.icon size={14} /> {tab.label}
                    </button>
                ))}
            </div>
        </div>

        {/* --- PORTFOLIO VIEW --- */}
        {activeTab === 'portfolio' ? (
            <div className="space-y-4">
                {portfolio.length === 0 ? (
                    <div className="text-center py-16 bg-[#111] rounded-xl border border-[#222] text-gray-500">
                        <Box size={40} className="mx-auto mb-2 opacity-30"/>
                        <p>You have no active investments.</p>
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
                            <GlassCard key={item.id} className="border border-[#222]">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        {asset.image_url ? (
                                            <img src={asset.image_url} className="w-10 h-10 object-contain rounded-md bg-white/5 p-1" />
                                        ) : (
                                            <div className="w-10 h-10 bg-white/10 rounded-md flex items-center justify-center font-bold text-white">
                                                {asset.name.charAt(0)}
                                            </div>
                                        )}
                                        <div>
                                            <h3 className="font-bold text-white">{asset.name}</h3>
                                            <p className="text-xs text-gray-400">{item.quantity} {asset.type === 'business' ? 'Units' : (asset.type === 'currency' ? '$' : 'g')}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-bold font-mono">৳{currentValue.toFixed(2)}</p>
                                        <p className={`text-[10px] font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                            {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)} ({pnlPercent.toFixed(1)}%)
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setSelectedAsset(asset); setTxMode('sell'); }}
                                        className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold hover:bg-red-500/20 transition"
                                    >
                                        Sell
                                    </button>
                                    {asset.type === 'commodity' && (
                                        <div className="flex-1 relative group">
                                            <input 
                                                type="text" 
                                                placeholder="Address..." 
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                onClick={(e) => {
                                                    const addr = prompt("Enter Delivery Address:");
                                                    if(addr) { setDeliveryAddress(addr); handleDelivery(item.id); }
                                                }}
                                            />
                                            <button className="w-full py-2 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                                                <Truck size={12}/> Request Delivery
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
                            <GlassCard key={asset.id} className="border border-[#222] group hover:border-neon-green/30 transition">
                                <div className="h-32 w-full bg-black/50 rounded-lg mb-4 overflow-hidden relative">
                                    <img src={asset.image_url || 'https://via.placeholder.com/300x150'} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition duration-500" />
                                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-neon-green border border-neon-green/20">
                                        {asset.profit_rate}% ROI
                                    </div>
                                </div>
                                
                                <h3 className="text-white font-bold text-lg mb-1">{asset.name}</h3>
                                <p className="text-xs text-gray-400 mb-3 line-clamp-2">{asset.description}</p>
                                
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Unit Price</span>
                                        <span className="text-white font-bold">৳{asset.current_price}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">Duration</span>
                                        <span className="text-white font-bold">{asset.duration_days} Days</span>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                            <span>Funding</span>
                                            <span>{progress.toFixed(1)}%</span>
                                        </div>
                                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                            <div className="h-full bg-neon-green" style={{width: `${progress}%`}}></div>
                                        </div>
                                    </div>
                                </div>

                                <button 
                                    onClick={() => { setSelectedAsset(asset); setTxMode('buy'); }}
                                    className="w-full py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition"
                                >
                                    Invest Now
                                </button>
                            </GlassCard>
                        );
                    }

                    // Commodity/Forex Card Layout
                    return (
                        <GlassCard key={asset.id} className="border border-[#222]">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center p-2 border border-white/5">
                                        <img src={asset.image_url} className="w-full h-full object-contain" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-lg">{asset.name}</h3>
                                        <div className={`flex items-center gap-1 text-xs font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                                            {isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                            {Math.abs(priceChange).toFixed(2)}%
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-gray-500 uppercase font-bold">Price</p>
                                    <p className="text-xl font-mono font-black text-white">৳{asset.current_price.toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Mini Chart Area (Fake) */}
                            <div className="h-16 w-full mb-4 opacity-50">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={[
                                        {v: asset.current_price * 0.98}, 
                                        {v: asset.current_price * 1.01}, 
                                        {v: asset.current_price * 0.99}, 
                                        {v: asset.current_price * 1.02}, 
                                        {v: asset.current_price}
                                    ]}>
                                        <Area type="monotone" dataKey="v" stroke={isUp ? "#4ade80" : "#f87171"} fill="url(#color)" fillOpacity={0.1} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="flex gap-2">
                                <button 
                                    onClick={() => { setSelectedAsset(asset); setTxMode('buy'); }}
                                    className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition text-sm"
                                >
                                    Buy
                                </button>
                                {getHoldingQty(asset.id) > 0 && (
                                    <button 
                                        onClick={() => { setSelectedAsset(asset); setTxMode('sell'); }}
                                        className="flex-1 py-2 bg-red-500/10 text-red-400 border border-red-500/20 font-bold rounded-lg hover:bg-red-500/20 transition text-sm"
                                    >
                                        Sell
                                    </button>
                                )}
                            </div>
                        </GlassCard>
                    );
                })}
            </div>
        )}

        {/* Transaction Modal */}
        <AnimatePresence>
            {selectedAsset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedAsset(null)}>
                    <motion.div 
                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-[#111] w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-1">
                            {txMode === 'buy' ? 'Buy' : 'Sell'} {selectedAsset.name}
                        </h3>
                        <p className="text-xs text-gray-400 mb-6">Current Price: ৳{selectedAsset.current_price} / {selectedAsset.type === 'business' ? 'Unit' : (selectedAsset.type === 'currency' ? 'USD' : 'g')}</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold uppercase block mb-1">
                                    Quantity ({selectedAsset.type === 'currency' ? 'USD' : (selectedAsset.type === 'business' ? 'Units' : 'Grams')})
                                </label>
                                <input 
                                    type="number" 
                                    autoFocus
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white font-bold text-lg focus:border-neon-green outline-none"
                                />
                            </div>

                            <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                                <span className="text-sm text-gray-400">Total Value</span>
                                <span className={`font-mono font-bold text-lg ${txMode === 'buy' ? 'text-red-400' : 'text-green-400'}`}>
                                    ৳{((parseFloat(amount) || 0) * selectedAsset.current_price).toFixed(2)}
                                </span>
                            </div>

                            <button 
                                onClick={handleTransaction}
                                disabled={isProcessing || !amount}
                                className={`w-full py-3 rounded-xl font-black uppercase tracking-wider flex items-center justify-center gap-2 ${
                                    txMode === 'buy' 
                                    ? 'bg-green-600 hover:bg-green-500 text-white' 
                                    : 'bg-red-600 hover:bg-red-500 text-white'
                                }`}
                            >
                                {isProcessing ? <Loader2 className="animate-spin" /> : 'Confirm'}
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
