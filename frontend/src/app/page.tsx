"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers, BrowserProvider, Contract } from "ethers";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { 
  Wallet, 
  Trophy, 
  Users, 
  Activity, 
  ArrowRight, 
  Loader2, 
  ShieldCheck,
  Zap,
  ChevronRight,
  Clock
} from "lucide-react";
import { abi, contractAddress } from "../constants";

// Extend the Window interface to include ethereum
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

// --- Types ---
interface ContractState {
  entranceFee: string;
  recentWinner: string;
  raffleState: number; // 0: OPEN, 1: CALCULATING
  playersCount: number;
  lastTimeStamp: number;
  interval: number;
}

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
  }
};

// --- Starfield Component (Realistic Lighting) ---
const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 150 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2,
        speed: Math.random() * 0.5 + 0.1,
        opacity: Math.random()
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        ctx.fillStyle = `rgba(168, 85, 247, ${star.opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y -= star.speed;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }
      });
      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', init);
    init();
    draw();

    return () => {
      window.removeEventListener('resize', init);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none opacity-40" />;
};

export default function Home() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [contractData, setContractData] = useState<ContractState | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Mouse move effect for background glow
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const updateUIInfo = useCallback(async (contractInstance: Contract) => {
    try {
      const [fee, winner, state, players, lastTS, interval] = await Promise.all([
        contractInstance.getEntranceFee(),
        contractInstance.getRecentWinner(),
        contractInstance.getRaffleState(),
        contractInstance.gets_players(),
        contractInstance.getLastTimeStamp(),
        contractInstance.getInterval()
      ]);

      setContractData({
        entranceFee: ethers.formatEther(fee),
        recentWinner: winner === ethers.ZeroAddress ? "" : winner,
        raffleState: Number(state),
        playersCount: players.length,
        lastTimeStamp: Number(lastTS),
        interval: Number(interval)
      });
    } catch (err) {
      console.error("Error fetching contract info", err);
      // Fallback if getInterval fails on old contracts
      try {
           const [fee, winner, state, players, lastTS] = await Promise.all([
            contractInstance.getEntranceFee(),
            contractInstance.getRecentWinner(),
            contractInstance.getRaffleState(),
            contractInstance.gets_players(),
            contractInstance.getLastTimeStamp()
          ]);
    
          setContractData({
            entranceFee: ethers.formatEther(fee),
            recentWinner: winner === ethers.ZeroAddress ? "" : winner,
            raffleState: Number(state),
            playersCount: players.length,
            lastTimeStamp: Number(lastTS),
            interval: 30 // Fallback default
          });
      } catch (e) {
          setMessage({ text: "Error fetching contract data.", type: 'error' });
      }
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (!contractData) return;

    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      const nextRaffle = contractData.lastTimeStamp + contractData.interval;
      const remaining = Math.max(0, nextRaffle - now);
      setTimeLeft(remaining);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [contractData]);

  const connectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      setLoading(true);
      try {
        const _provider = new BrowserProvider(window.ethereum);
        const _signer = await _provider.getSigner();
        const _address = await _signer.getAddress();
        const _contract = new Contract(contractAddress, abi, _signer);

        setAddress(_address);
        await updateUIInfo(_contract);
      } catch (err) {
        console.error("Connection failed", err);
        setMessage({ text: "Wallet connection failed.", type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      setMessage({ text: "Please install MetaMask.", type: 'error' });
    }
  }, [updateUIInfo]);

  useEffect(() => {
    connectWallet();
  }, [connectWallet]);

  const enterRaffle = async () => {
    if (!window.ethereum || !address) return;
    setActionLoading(true);
    setMessage({ text: "Confirming entry in wallet...", type: 'info' });
    try {
      const _provider = new BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _contract = new Contract(contractAddress, abi, _signer);

      const fee = await _contract.getEntranceFee();
      const tx = await _contract.enterRaffle({ value: fee });
      setMessage({ text: "Transaction sent! Waiting for confirmation...", type: 'info' });
      await tx.wait();
      setMessage({ text: "Successfully entered the raffle!", type: 'success' });
      await updateUIInfo(_contract);
    } catch (err: unknown) {
      console.error("Entry error", err);
      const errorMessage = err instanceof Error ? err.message : "Transaction failed.";
      if (errorMessage.includes("RaffleNotOpen")) {
        setMessage({ text: "Raffle is currently closed for calculations.", type: 'error' });
      } else {
        setMessage({ text: "Failed to enter raffle.", type: 'error' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="relative min-h-screen bg-background overflow-hidden selection:bg-accent/30 flex flex-col items-center"
      onMouseMove={handleMouseMove}
      style={{
        '--x': `${mousePos.x}px`,
        '--y': `${mousePos.y}px`
      } as React.CSSProperties}
    >
      {/* Visual Polish */}
      <Starfield />
      <div className="absolute inset-0 bg-glow pointer-events-none" />
      <div className="noise-overlay" />
      
      {/* Nav */}
      <nav className="relative z-50 w-full max-w-7xl px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-110 transition-transform">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tighter iridescent-text">REFLECT</span>
        </div>

        <button
          onClick={connectWallet}
          disabled={loading}
          className="glass-card px-6 py-2.5 rounded-full flex items-center gap-2 hover:bg-white/5 active:scale-95 transition-all text-sm font-medium border-white/10"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-accent" />
          ) : (
            <Wallet className="w-4 h-4 text-accent" />
          )}
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
        </button>
      </nav>

      {/* Main Content */}
      <motion.main 
        className="relative z-20 w-full max-w-4xl px-8 flex flex-col items-center pt-20 pb-32"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="text-center mb-16 space-y-6">
          <h1 className="text-7xl md:text-8xl font-extrabold tracking-tighter leading-[0.9] text-white">
            THE <br /> 
            <span className="iridescent-text">REFLECT</span> <br />
            LOTTERY
          </h1>
          <p className="text-lg text-white/40 max-w-xl mx-auto font-light leading-relaxed">
            A minimalist, decentralized raffle protocol where fair play meets premium design. 
            Powered by Chainlink VRF on Ethereum Sepolia.
          </p>
        </motion.div>

        {/* Action Center */}
        <motion.div variants={itemVariants} className="w-full flex flex-col items-center">
          <AnimatePresence mode="wait">
            {!address ? (
              <motion.div 
                key="unconnected"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass-card p-12 rounded-[2rem] text-center max-w-md w-full"
              >
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShieldCheck className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">Secure Access</h3>
                <p className="text-white/40 mb-8 text-sm">Please authenticate your wallet to access the decentralized raffle pool.</p>
                <button 
                  onClick={connectWallet}
                  className="w-full py-4 bg-accent hover:bg-accent/90 text-white font-bold rounded-2xl shadow-[0_10px_30px_rgba(168,85,247,0.3)] transition-all transform hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2"
                >
                  Authenticate Wallet <ArrowRight className="w-5 h-5" />
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="connected"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard 
                    label="Entrance Fee" 
                    value={`${contractData?.entranceFee || "0"} ETH`} 
                    icon={<Zap className="w-5 h-5 text-accent" />} 
                  />
                  <StatCard 
                    label="Active Players" 
                    value={String(contractData?.playersCount || 0)} 
                    icon={<Users className="w-5 h-5 text-accent" />} 
                  />
                  <StatCard 
                    label="Status" 
                    value={contractData?.raffleState === 0 ? "OPEN" : "CALCULATING"} 
                    icon={<Activity className={`w-5 h-5 ${contractData?.raffleState === 0 ? 'text-green-400' : 'text-yellow-400'}`} />} 
                  />
                  <StatCard 
                    label="Next Raffle" 
                    value={formatTime(timeLeft)} 
                    icon={<Clock className="w-5 h-5 text-accent" />} 
                  />
                </div>

                {/* Main Action Card */}
                <div className="glass-card p-10 rounded-[2.5rem] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                    <Trophy className="w-32 h-32" />
                  </div>
                  
                  {/* Glowing Pulse behind button */}
                  <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Pool Active
                      </div>
                      <h2 className="text-4xl font-bold text-white tracking-tight">Ready to Win?</h2>
                      <p className="text-white/40 max-w-xs text-sm font-light">
                        Join the current pool for a chance to win the majority share of the accumulated ETH.
                      </p>
                    </div>

                    <button
                      onClick={enterRaffle}
                      disabled={actionLoading || contractData?.raffleState !== 0}
                      className={`min-w-[200px] h-20 rounded-3xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 active:scale-95 shadow-xl
                        ${actionLoading || contractData?.raffleState !== 0 
                          ? 'bg-white/5 text-white/20 cursor-not-allowed border-white/5' 
                          : 'bg-white text-black hover:bg-white/90 shadow-[0_20px_50px_rgba(255,255,255,0.2)]'
                        }`}
                    >
                      {actionLoading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>Enter Raffle <ChevronRight className="w-5 h-5" /></>
                      )}
                    </button>
                  </div>

                  {message && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`mt-10 p-4 rounded-2xl flex items-center gap-3 border ${
                        message.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-300' :
                        message.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-300' :
                        'bg-accent/10 border-accent/20 text-accent'
                      }`}
                    >
                      <div className={`w-2 h-2 rounded-full ${message.type === 'error' ? 'bg-red-500' : message.type === 'success' ? 'bg-green-500' : 'bg-accent'}`} />
                      <span className="text-sm font-medium">{message.text}</span>
                    </motion.div>
                  )}
                </div>

                {/* Recent Winner Display */}
                <div className="w-full glass-card p-8 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Trophy className="w-6 h-6 text-white/20" />
                    </div>
                    <div>
                      <p className="text-xs text-white/30 uppercase tracking-widest font-semibold">Last Winner</p>
                      <p className="font-mono text-sm text-accent tracking-tighter truncate max-w-[200px] md:max-w-none">
                        {contractData?.recentWinner || "Waiting for first win..."}
                      </p>
                    </div>
                  </div>
                  <div className="h-full w-px bg-white/10 hidden md:block" />
                  <div className="text-right">
                    <button className="text-xs font-semibold text-white/30 hover:text-white transition-colors flex items-center gap-1 group">
                      View Contract History <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.main>

      {/* Footer */}
      <footer className="relative z-50 w-full max-w-7xl px-8 py-12 flex flex-col md:flex-row items-center justify-between border-t border-white/5">
        <div className="text-xs text-white/20 font-light flex items-center gap-6">
          <span>© 2026 REFLECT CORE</span>
          <span className="w-1 h-1 rounded-full bg-white/10" />
          <span>DECENTRALIZED AUTONOMY</span>
        </div>
        <div className="mt-6 md:mt-0 flex items-center gap-8 text-[10px] font-mono text-white/40 uppercase tracking-widest">
          <a href="#" className="hover:text-accent transition-colors">Documentation</a>
          <a href="#" className="hover:text-accent transition-colors">Privacy</a>
          <a href="#" className="hover:text-accent transition-colors">GitHub</a>
        </div>
      </footer>
    </div>
  );
}

// --- Subcomponents ---

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-card p-6 rounded-[1.5rem] space-y-3 hover:border-accent/40 transition-colors group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">{label}</span>
        <div className="p-2 rounded-xl bg-white/5 group-hover:bg-accent/10 transition-colors">
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold text-white tracking-tight">{value}</p>
    </div>
  );
}
