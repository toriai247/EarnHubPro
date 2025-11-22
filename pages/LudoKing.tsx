
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Trophy, Star, User, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../integrations/supabase/client';
import { useUI } from '../context/UIContext';
import { updateWallet, processGameResult } from '../lib/actions';
import BalanceDisplay from '../components/BalanceDisplay';

// --- TYPES ---
type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

interface Token {
    id: number;
    pos: number; // -1: Base, 0-51: Main Path, 52-57: Home Path, 99: Won
}

interface Player {
    id: string;
    name: string;
    color: PlayerColor;
    tokens: Token[];
    isBot: boolean;
    isActive: boolean;
    hasWon: boolean;
}

// --- CONSTANTS ---
const PATH_MAP: Record<number, [number, number]> = {
    // Main path 0-51 (Start at Red 0)
    0: [14, 7], 1: [13, 7], 2: [12, 7], 3: [11, 7], 4: [10, 7], 5: [9, 6],
    6: [9, 5], 7: [9, 4], 8: [9, 3], 9: [9, 2], 10: [9, 1], 11: [8, 1],
    12: [7, 1], 13: [7, 2], 14: [7, 3], 15: [7, 4], 16: [7, 5], 17: [7, 6],
    18: [6, 7], 19: [5, 7], 20: [4, 7], 21: [3, 7], 22: [2, 7], 23: [1, 7],
    24: [1, 8], 25: [1, 9], 26: [2, 9], 27: [3, 9], 28: [4, 9], 29: [5, 9],
    30: [6, 9], 31: [7, 10], 32: [7, 11], 33: [7, 12], 34: [7, 13], 35: [7, 14],
    36: [7, 15], 37: [8, 15], 38: [9, 15], 39: [9, 14], 40: [9, 13], 41: [9, 12],
    42: [9, 11], 43: [9, 10], 44: [10, 9], 45: [11, 9], 46: [12, 9], 47: [13, 9],
    48: [14, 9], 49: [15, 9], 50: [15, 8], 51: [15, 7]
};

const HOME_PATHS = {
    red: [[14, 8], [13, 8], [12, 8], [11, 8], [10, 8], [9, 8]],
    green: [[8, 2], [8, 3], [8, 4], [8, 5], [8, 6], [8, 7]],
    yellow: [[2, 8], [3, 8], [4, 8], [5, 8], [6, 8], [7, 8]],
    blue: [[8, 14], [8, 13], [8, 12], [8, 11], [8, 10], [8, 9]]
};

// Offsets for main path
const START_OFFSETS = { red: 0, green: 13, yellow: 26, blue: 39 };

const SAFE_SPOTS = [0, 8, 13, 21, 26, 34, 39, 47];

// --- COMPONENTS ---

const Pawn = ({ color, onClick, active }: { color: string, onClick?: () => void, active?: boolean }) => (
    <motion.div
        layout
        onClick={(e) => { if(active && onClick) { e.stopPropagation(); onClick(); } }}
        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white shadow-md z-20 relative flex items-center justify-center transition-transform ${active ? 'cursor-pointer scale-125 z-50 animate-bounce ring-2 ring-white' : ''}`}
        style={{ 
            backgroundColor: color === 'yellow' ? '#fbbf24' : color === 'red' ? '#ef4444' : color === 'green' ? '#22c55e' : '#3b82f6',
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
        }}
    >
        <div className="w-3 h-3 rounded-full bg-black/20"></div>
    </motion.div>
);

const Dice = ({ value, rolling, onClick, disabled, color }: any) => {
    const bg = color === 'red' ? 'bg-red-100 text-red-600' : color === 'green' ? 'bg-green-100 text-green-600' : color === 'yellow' ? 'bg-yellow-100 text-yellow-600' : 'bg-blue-100 text-blue-600';
    return (
        <button 
            disabled={disabled}
            onClick={onClick}
            className={`w-16 h-16 rounded-xl shadow-lg flex items-center justify-center text-2xl font-bold border-2 transition-all ${bg} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 cursor-pointer border-current'}`}
        >
            {rolling ? '...' : value || <Play size={20} />}
        </button>
    );
};

const LudoKing: React.FC = () => {
    const { stake } = useParams();
    const [searchParams] = useSearchParams();
    const mode = searchParams.get('mode') || '4p';
    
    const navigate = useNavigate();
    const { toast } = useUI();
    
    // Game State
    const [players, setPlayers] = useState<Player[]>([]);
    const [turnIndex, setTurnIndex] = useState(0);
    const [diceValue, setDiceValue] = useState<number | null>(null);
    const [rolling, setRolling] = useState(false);
    const [movableTokens, setMovableTokens] = useState<number[]>([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [winner, setWinner] = useState<Player | null>(null);

    const userIdRef = useRef<string>('');

    useEffect(() => {
        initializeGame();
    }, []);

    // Bot Loop
    useEffect(() => {
        if (!gameStarted || winner) return;
        const currentPlayer = players[turnIndex];
        
        if (currentPlayer.isBot) {
            const botTurn = async () => {
                // 1. Roll
                if (!diceValue && !rolling) {
                    await new Promise(r => setTimeout(r, 1000));
                    handleRollDice();
                }
                // 2. Move
                else if (diceValue && !rolling) {
                    const moves = getValidMoves(currentPlayer, diceValue);
                    if (moves.length > 0) {
                        await new Promise(r => setTimeout(r, 1000));
                        // Simple Bot AI: Pick first move (or improve to pick capture/home)
                        let bestMove = moves[0];
                        // Try to find a capture move or home move
                        // For now, random valid move
                        handleMoveToken(currentPlayer.id, bestMove);
                    } else {
                        await new Promise(r => setTimeout(r, 1000));
                        nextTurn();
                    }
                }
            };
            botTurn();
        }
    }, [turnIndex, diceValue, rolling, gameStarted, winner, players]); // Dependencies important for bot loop

    const initializeGame = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) { navigate('/login'); return; }
        
        userIdRef.current = session.user.id;
        
        // Deduct Balance
        const entryFee = parseFloat(stake || '0');
        if (entryFee > 0) {
            try {
                await updateWallet(session.user.id, entryFee, 'decrement', 'main_balance');
            } catch (e) {
                toast.error("Failed to deduct entry fee");
                navigate('/games/ludo');
                return;
            }
        }

        // Setup Players
        const newPlayers: Player[] = [
            { id: session.user.id, name: 'You', color: 'red', isBot: false, isActive: true, hasWon: false, tokens: [0,1,2,3].map(i => ({id: i, pos: -1})) },
            { id: 'bot1', name: 'Bot 1', color: 'green', isBot: true, isActive: mode === '4p', hasWon: false, tokens: [0,1,2,3].map(i => ({id: i, pos: -1})) },
            { id: 'bot2', name: 'Bot 2', color: 'yellow', isBot: true, isActive: true, hasWon: false, tokens: [0,1,2,3].map(i => ({id: i, pos: -1})) },
            { id: 'bot3', name: 'Bot 3', color: 'blue', isBot: true, isActive: mode === '4p', hasWon: false, tokens: [0,1,2,3].map(i => ({id: i, pos: -1})) },
        ];

        setPlayers(newPlayers);
        setGameStarted(true);
    };

    const handleRollDice = () => {
        if (rolling) return;
        setRolling(true);
        
        setTimeout(() => {
            const val = Math.floor(Math.random() * 6) + 1;
            // const val = 6; // DEBUG
            setDiceValue(val);
            setRolling(false);
            
            const current = players[turnIndex];
            const moves = getValidMoves(current, val);
            
            if (moves.length === 0) {
                setTimeout(nextTurn, 800);
            } else if (moves.length === 1 && current.isBot) {
                // Bot handles in effect
            } else {
                // Player choice or Bot choice
                setMovableTokens(moves);
            }
        }, 500);
    };

    const getValidMoves = (p: Player, roll: number) => {
        return p.tokens.map((t, idx) => {
            if (t.pos === 99) return -1; // Already won
            if (t.pos === -1) return roll === 6 ? idx : -1; // Need 6 to start
            if (t.pos + roll <= 57) return idx; // Can move
            return -1;
        }).filter(i => i !== -1);
    };

    const handleMoveToken = (pid: string, tokenIdx: number) => {
        if (!diceValue) return;
        
        setPlayers(prev => {
            const nextPlayers = [...prev];
            const pIndex = nextPlayers.findIndex(p => p.id === pid);
            const p = { ...nextPlayers[pIndex] };
            const tokens = [...p.tokens];
            const t = { ...tokens[tokenIdx] };

            let newPos = t.pos;
            if (t.pos === -1) newPos = 0;
            else newPos += diceValue;

            if (newPos === 57) newPos = 99; // Home

            // Check Captures (Only if on main path)
            let captured = false;
            if (newPos < 52) {
                const globalPos = (START_OFFSETS[p.color] + newPos) % 52;
                if (!SAFE_SPOTS.includes(globalPos)) {
                    nextPlayers.forEach((opp, oppIdx) => {
                        if (opp.id !== pid && opp.isActive) {
                            const oppTokens = [...opp.tokens];
                            let modified = false;
                            oppTokens.forEach((ot, otIdx) => {
                                if (ot.pos > -1 && ot.pos < 52) {
                                    const oppGlobal = (START_OFFSETS[opp.color] + ot.pos) % 52;
                                    if (oppGlobal === globalPos) {
                                        // Capture!
                                        oppTokens[otIdx] = { ...ot, pos: -1 };
                                        modified = true;
                                        captured = true;
                                        if (pid === userIdRef.current) toast.success("Captured opponent!");
                                    }
                                }
                            });
                            if (modified) nextPlayers[oppIdx] = { ...opp, tokens: oppTokens };
                        }
                    });
                }
            }

            tokens[tokenIdx] = { ...t, pos: newPos };
            p.tokens = tokens;
            
            // Check Win Condition
            if (tokens.every(tk => tk.pos === 99)) {
                p.hasWon = true;
                handleWin(p);
            }

            nextPlayers[pIndex] = p;
            
            // Determine next turn
            // Bonus turn if 6, capture, or home
            const bonus = diceValue === 6 || captured || newPos === 99;
            
            setTimeout(() => {
                if (bonus && !p.hasWon) {
                    setDiceValue(null);
                    setMovableTokens([]);
                    // Player rolls again
                } else {
                    changeTurn(nextPlayers);
                }
            }, 500);

            return nextPlayers;
        });
        
        setMovableTokens([]);
    };

    const nextTurn = () => {
        changeTurn(players);
    };

    const changeTurn = (currentPlayers: Player[]) => {
        setDiceValue(null);
        setMovableTokens([]);
        
        let nextIndex = (turnIndex + 1) % 4;
        let loopCount = 0;
        // Find next active player who hasn't won
        while ((!currentPlayers[nextIndex].isActive || currentPlayers[nextIndex].hasWon) && loopCount < 4) {
            nextIndex = (nextIndex + 1) % 4;
            loopCount++;
        }
        
        if (loopCount >= 4) {
            // Game Over
            toast.info("Game Over");
            return;
        }
        
        setTurnIndex(nextIndex);
    };

    const handleWin = async (winner: Player) => {
        setWinner(winner);
        if (winner.id === userIdRef.current) {
            // Payout
            const fee = parseFloat(stake || '0');
            const totalPot = fee * (mode === '1v1' ? 2 : 4);
            const winAmount = totalPot * 0.85; // 15% Platform Fee
            
            try {
                await updateWallet(userIdRef.current, winAmount, 'increment', 'game_balance');
                await processGameResult(userIdRef.current, 'ludo', 'Ludo King', fee, winAmount, 'Won Match');
                toast.success(`You Won! Prize: $${winAmount}`);
            } catch (e) {
                console.error(e);
            }
        } else {
            const fee = parseFloat(stake || '0');
            await processGameResult(userIdRef.current, 'ludo', 'Ludo King', fee, 0, 'Lost Match');
            toast.info("You Lost.");
        }
    };

    // --- RENDER HELPERS ---
    const renderBoardGrid = () => {
        const cells = [];
        for(let r=1; r<=15; r++) {
            for(let c=1; c<=15; c++) {
                // Bases (Blank in grid, handled by overlay)
                if ((r<=6 && c<=6) || (r<=6 && c>=10) || (r>=10 && c<=6) || (r>=10 && c>=10)) {
                    cells.push(<div key={`${r}-${c}`} style={{gridArea:`${r}/${c}`}}></div>);
                    continue;
                }
                // Center
                if (r>=7 && r<=9 && c>=7 && c<=9) {
                    if (r===7 && c===7) cells.push(<div key="center" style={{gridArea:'7/7/10/10'}} className="bg-white relative"><div className="absolute inset-0 flex items-center justify-center"><Trophy className="text-yellow-500"/></div></div>);
                    else continue;
                } else {
                    // Path Cells
                    let bg = 'bg-white';
                    let isStar = false;
                    
                    // Home Paths
                    if (c===8 && r>9 && r<15) bg = 'bg-red-200'; 
                    if (r===8 && c<7 && c>1) bg = 'bg-green-200'; 
                    if (c===8 && r<7 && r>1) bg = 'bg-yellow-200';
                    if (r===8 && c>9 && c<15) bg = 'bg-blue-200';

                    // Start Cells
                    if (r===14 && c===7) { bg = 'bg-red-500'; isStar=true; }
                    if (r===7 && c===2) { bg = 'bg-green-500'; isStar=true; }
                    if (r===2 && c===9) { bg = 'bg-yellow-500'; isStar=true; }
                    if (r===9 && c===14) { bg = 'bg-blue-500'; isStar=true; }

                    // Safe Spots
                    if ((r===9&&c===3) || (r===3&&c===7) || (r===7&&c===13) || (r===13&&c===9)) isStar=true;

                    cells.push(
                        <div key={`${r}-${c}`} style={{gridArea:`${r}/${c}`}} className={`border border-slate-300/50 relative flex items-center justify-center ${bg}`}>
                            {isStar && <Star size={12} className="text-black/20" fill="currentColor"/>}
                            {renderTokensAt(r, c)}
                        </div>
                    );
                }
            }
        }
        return cells;
    };

    const renderTokensAt = (r: number, c: number) => {
        if (!gameStarted) return null;
        
        const tokensHere: any[] = [];
        players.forEach(p => {
            if (!p.isActive) return;
            p.tokens.forEach((t, idx) => {
                if (t.pos === -1 || t.pos === 99) return;
                
                let tr = 0, tc = 0;
                if (t.pos < 52) {
                    const gp = (START_OFFSETS[p.color] + t.pos) % 52;
                    [tr, tc] = PATH_MAP[gp];
                } else {
                    const hp = HOME_PATHS[p.color][t.pos - 52];
                    if (hp) [tr, tc] = hp;
                }

                if (tr === r && tc === c) {
                    tokensHere.push({ p, t, idx });
                }
            });
        });

        if (tokensHere.length === 0) return null;

        return (
            <div className={`absolute inset-0 grid ${tokensHere.length > 1 ? 'grid-cols-2 scale-75' : 'place-items-center'}`}>
                {tokensHere.map((item, i) => {
                    const isMyTurn = players[turnIndex].id === item.p.id;
                    const isMovable = isMyTurn && movableTokens.includes(item.idx);
                    return (
                        <Pawn 
                            key={`${item.p.color}-${i}`} 
                            color={item.p.color} 
                            active={isMovable} 
                            onClick={() => isMovable && handleMoveToken(item.p.id, item.idx)}
                        />
                    );
                })}
            </div>
        );
    };

    const renderBase = (color: PlayerColor, area: string) => {
        const p = players.find(pl => pl.color === color);
        if (!p || !p.isActive) return <div style={{gridArea: area}} className="bg-slate-800 opacity-50 border-[16px] border-slate-700"></div>;

        return (
            <div style={{gridArea: area}} className={`bg-white border-[16px] border-${color === 'yellow' ? 'yellow-400' : color + '-500'} p-4 relative shadow-inner`}>
                <div className="w-full h-full grid grid-cols-2 gap-4">
                    {[0,1,2,3].map(i => (
                        <div key={i} className={`rounded-full bg-${color === 'yellow' ? 'yellow-100' : color + '-100'} flex items-center justify-center shadow-inner`}>
                            {p.tokens[i].pos === -1 && (
                                <Pawn 
                                    color={color} 
                                    active={p.id === players[turnIndex].id && movableTokens.includes(i)}
                                    onClick={() => movableTokens.includes(i) && handleMoveToken(p.id, i)}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-slate-900/80 to-transparent">
                <Link to="/games/ludo" className="bg-white/10 p-2 rounded-full text-white"><ArrowLeft /></Link>
                <div className="bg-black/40 px-4 py-2 rounded-full text-white font-bold border border-white/10">
                    Pot: <span className="text-green-400">${(parseFloat(stake || '0') * (mode==='1v1'?2:4)).toFixed(2)}</span>
                </div>
                <div className="w-10"></div>
            </div>

            {/* Board */}
            <div className="w-full max-w-md aspect-square bg-white shadow-2xl rounded-lg overflow-hidden grid grid-cols-15 grid-rows-15 relative border-4 border-slate-800">
                {renderBase('green', '1/1/7/7')}
                {renderBase('yellow', '1/10/7/16')}
                {renderBase('red', '10/1/16/7')}
                {renderBase('blue', '10/10/16/16')}
                {renderBoardGrid()}
            </div>

            {/* Controls */}
            <div className="absolute bottom-8 left-0 right-0 px-6">
                <div className="max-w-md mx-auto bg-slate-800/90 backdrop-blur p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-2xl">
                    {/* Current Player Info */}
                    <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-full border-4 border-${players[turnIndex]?.color === 'yellow' ? 'yellow-400' : players[turnIndex]?.color + '-500'} bg-slate-700 flex items-center justify-center`}>
                            <User size={24} className="text-white" />
                        </div>
                        <div>
                            <p className="text-white font-bold text-sm">{players[turnIndex]?.name}</p>
                            <p className="text-xs text-gray-400">{players[turnIndex]?.id === userIdRef.current ? 'Your Turn' : 'Thinking...'}</p>
                        </div>
                    </div>

                    {/* Dice */}
                    <Dice 
                        value={diceValue} 
                        rolling={rolling} 
                        color={players[turnIndex]?.color}
                        disabled={players[turnIndex]?.isBot || (!!diceValue && movableTokens.length > 0)}
                        onClick={handleRollDice} 
                    />
                </div>
            </div>

            {/* Winner Modal */}
            {winner && (
                <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6">
                    <div className="bg-slate-800 p-8 rounded-3xl text-center border border-yellow-500/30 shadow-2xl max-w-sm w-full">
                        <Trophy size={64} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                        <h2 className="text-3xl font-black text-white mb-2">{winner.name} Wins!</h2>
                        <p className="text-gray-400 mb-6">The match has ended.</p>
                        <Link to="/games/ludo" className="block w-full py-3 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-300 transition">
                            Back to Lobby
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LudoKing;
