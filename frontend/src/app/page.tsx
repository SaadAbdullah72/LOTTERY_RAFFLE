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
  Clock,
  Settings,
  PlusCircle,
  RefreshCcw,
  Sparkles,
  ExternalLink,
  Lock,
  Coins
} from "lucide-react";
import { abi, contractAddress } from "../constants";

// --- Configuration ---
const VRF_COORDINATOR_ADDRESS = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const SUB_ID = "15993839906387054297531610053355364271225837432935631693595241318358973806335";

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
  owner: string;
  poolBalance: string;
  players: string[];
}

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 30 },
  visible: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: { type: 'spring', damping: 20, stiffness: 100 }
  }
};

// --- Starfield Component (Premium Starry Background) ---
const Starfield = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: { x: number; y: number; size: number; speed: number; opacity: number; color: string }[] = [];

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stars = Array.from({ length: 200 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5,
        speed: Math.random() * 0.3 + 0.05,
        opacity: Math.random(),
        color: Math.random() > 0.8 ? '#A855F7' : '#FFFFFF'
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach(star => {
        ctx.fillStyle = star.color;
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        star.y -= star.speed;
        if (star.y < 0) {
          star.y = canvas.height;
          star.x = Math.random() * canvas.width;
        }
        
        // Twinkle
        if (Math.random() > 0.98) star.opacity = Math.random();
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

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />;
};

export default function Home() {
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'error' | 'success' } | null>(null);
  const [contractData, setContractData] = useState<ContractState | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Mouse move effect for background dynamic glow
  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePos({ x: e.clientX, y: e.clientY });
  };

  const updateUIInfo = useCallback(async (contractInstance: Contract, signerAddress: string) => {
    try {
      const provider = contractInstance.runner?.provider;
      const [fee, winner, state, players, lastTS, interval, owner, balance] = await Promise.all([
        contractInstance.getEntranceFee(),
        contractInstance.getRecentWinner(),
        contractInstance.getRaffleState(),
        contractInstance.gets_players(),
        contractInstance.getLastTimeStamp(),
        contractInstance.getInterval(),
        contractInstance.owner(),
        provider ? provider.getBalance(contractAddress) : Promise.resolve(0n)
      ]);

      setContractData({
        entranceFee: ethers.formatEther(fee),
        recentWinner: winner === ethers.ZeroAddress ? "" : winner,
        raffleState: Number(state),
        playersCount: players.length,
        lastTimeStamp: Number(lastTS),
        interval: Number(interval),
        owner: owner,
        poolBalance: ethers.formatEther(balance),
        players: players.map((p: any) => String(p))
      });

      setIsAdmin(owner.toLowerCase() === signerAddress.toLowerCase());
    } catch (err) {
      console.error("Error fetching contract info", err);
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

  // Network Check & Smart Connect
  const connectWallet = useCallback(async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      setLoading(true);
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') {
          setMessage({ text: "Switching to Sepolia...", type: 'info' });
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0xaa36a7' }],
            });
          } catch (e: any) {
            if (e.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://ethereum-sepolia-rpc.publicnode.com'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                }],
              });
            }
          }
        }

        const _provider = new BrowserProvider(window.ethereum);
        const _signer = await _provider.getSigner();
        const _address = await _signer.getAddress();
        const _contract = new Contract(contractAddress, abi, _signer);

        setAddress(_address);
        await updateUIInfo(_contract, _address);
      } catch (err) {
        setMessage({ text: "Connection failed.", type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      setMessage({ text: "Please install MetaMask.", type: 'error' });
    }
  }, [updateUIInfo]);

  useEffect(() => {
    connectWallet();
    const interval = setInterval(() => {
        if (address) {
            const _provider = new BrowserProvider(window.ethereum);
            _provider.getSigner().then(s => {
                const _contract = new Contract(contractAddress, abi, s);
                updateUIInfo(_contract, address);
            });
        }
    }, 10000);
    return () => clearInterval(interval);
  }, [address, connectWallet, updateUIInfo]);

  // --- Contract Actions ---
  
  const enterRaffle = async () => {
    if (!address) return;
    setActionLoading(true);
    setMessage({ text: "Initiating entry...", type: 'info' });
    try {
      const _provider = new BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _contract = new Contract(contractAddress, abi, _signer);
      const fee = await _contract.getEntranceFee();
      const tx = await _contract.enterRaffle({ value: fee });
      setMessage({ text: "Transaction sent to pool...", type: 'info' });
      await tx.wait();
      setMessage({ text: "You're in the pool! Best of luck.", type: 'success' });
      await updateUIInfo(_contract, address);
    } catch (err: any) {
      setMessage({ text: err.message.includes("RaffleNotOpen") ? "Raffle is calculating..." : "Entry failed.", type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const triggerWinner = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    setMessage({ text: "Triggering winner selection (performUpkeep)...", type: 'info' });
    try {
      const _provider = new BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const _contract = new Contract(contractAddress, abi, _signer);
      const tx = await _contract.performUpkeep("0x");
      await tx.wait();
      setMessage({ text: "Ritual Initiated. Chainlink is calculating...", type: 'success' });
      await updateUIInfo(_contract, address);
    } catch (err: any) {
      setMessage({ text: "Trigger failed. Conditions might not be met.", type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const fundVRF = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    const amount = prompt("Enter Sepolia ETH amount to fund (e.g. 0.1):", "0.1");
    if (!amount) { setActionLoading(false); return; }
    
    setMessage({ text: "Funding VRF Subscription...", type: 'info' });
    try {
      const _provider = new BrowserProvider(window.ethereum);
      const _signer = await _provider.getSigner();
      const coordinator = new Contract(VRF_COORDINATOR_ADDRESS, ["function fundSubscriptionWithNative(uint256 subId) external payable"], _signer);
      const tx = await coordinator.fundSubscriptionWithNative(SUB_ID, { value: ethers.parseEther(amount) });
      await tx.wait();
      setMessage({ text: `Successfully funded VRF with ${amount} ETH!`, type: 'success' });
    } catch (err: any) {
      setMessage({ text: "Funding failed.", type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const emergencyReset = async () => {
    if (!isAdmin) return;
    setActionLoading(true);
    setMessage({ text: "Attempting emergency reset...", type: 'info' });
    try {
        const _provider = new BrowserProvider(window.ethereum);
        const _signer = await _provider.getSigner();
        const _contract = new Contract(contractAddress, abi, _signer);
        const tx = await _contract.forceResetRaffle();
        await tx.wait();
        setMessage({ text: "Raffle state reset to OPEN.", type: 'success' });
        await updateUIInfo(_contract, address);
    } catch (err: any) {
        setMessage({ text: "Reset failed. Only works if state is CALCULATING.", type: 'error' });
    } finally {
        setActionLoading(false);
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div 
      className="relative min-h-screen bg-[#030014] text-white selection:bg-purple-500/30 overflow-x-hidden font-sans"
      onMouseMove={handleMouseMove}
    >
      <Starfield />
      
      {/* Background Decor */}
      <div 
        className="fixed inset-0 z-0 transition-opacity duration-300 pointer-events-none opacity-20"
        style={{
          background: `radial-gradient(circle 600px at ${mousePos.x}px ${mousePos.y}px, rgba(168, 85, 247, 0.15), transparent 80%)`
        }}
      />
      <div className="fixed top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[150px] rounded-full z-0 animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full z-0" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] backdrop-blur-xl border-b border-white/5 bg-black/40">
        <div className="max-w-7xl mx-auto px-8 h-20 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 p-[1px]">
              <div className="w-full h-full rounded-[11px] bg-[#030014] flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
               REFLECT
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            {isAdmin && (
                <button
                    onClick={() => setShowAdmin(!showAdmin)}
                    className={`p-2.5 rounded-xl border border-white/10 transition-all ${showAdmin ? 'bg-purple-500/20 text-purple-400' : 'bg-white/5 text-white/40 hover:text-white'}`}
                >
                    <Settings className="w-5 h-5" />
                </button>
            )}
            <button
              onClick={connectWallet}
              className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center gap-3 text-sm font-semibold group"
            >
              <div className={`w-2 h-2 rounded-full ${address ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-yellow-500'}`} />
              <span className="hidden sm:inline">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Protocol"}
              </span>
              <Wallet className="w-4 h-4 text-purple-400 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        </div>
      </nav>

      <main className="relative z-10 pt-32 pb-20 px-8 max-w-7xl mx-auto">
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Dashboard Left: Main Entry Card (8 columns) */}
          <motion.div variants={itemVariants} className="lg:col-span-8 space-y-8">
            
            {/* Hero Card */}
            <div className="relative p-12 rounded-[2.5rem] bg-gradient-to-br from-white/10 to-transparent border border-white/10 backdrop-blur-3xl overflow-hidden group">
              <div className="absolute top-0 right-0 p-12 opacity-[0.05] group-hover:scale-110 transition-transform duration-700">
                <Trophy className="w-48 h-48" />
              </div>
              
              <div className="relative z-10 space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[10px] font-bold tracking-widest uppercase text-purple-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Live Pool Active
                </div>
                
                <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-none">
                  DECENTRALIZED <br />
                  <span className="text-purple-500">RAFFLE.</span>
                </h1>
                
                <p className="text-white/40 max-w-lg text-lg font-light leading-relaxed">
                  The protocol is primed. {contractData?.playersCount || 0} participants have already committed. 
                  Join the transparent raffle pool powered by Chainlink VRF.
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                  <button
                    onClick={enterRaffle}
                    disabled={actionLoading || contractData?.raffleState !== 0}
                    className={`relative w-full sm:w-auto h-20 px-12 rounded-2xl bg-white text-black font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(255,255,255,0.15)] flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed cursor-pointer group
                        ${actionLoading || contractData?.raffleState !== 0 ? '' : 'hover:shadow-[0_20px_60px_rgba(168,85,247,0.4)]'}
                    `}
                  >
                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>ENTER RAFFLE <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>

                  <div className="flex items-center gap-3 text-white/30 text-sm font-medium">
                    <ShieldCheck className="w-5 h-5" />
                    Audited Contract
                  </div>
                </div>
              </div>
            </div>

            {/* Calculations Ritual (Animated State) */}
            <AnimatePresence>
                {contractData?.raffleState === 1 && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/10 flex flex-col items-center text-center space-y-4"
                    >
                        <div className="relative">
                            <RefreshCcw className="w-12 h-12 text-amber-500 animate-spin" />
                            <div className="absolute inset-0 blur-[20px] bg-amber-500/30 animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-tighter text-amber-500">Winner Pick in Progress</h3>
                        <p className="text-white/40 text-sm max-w-sm">Chainlink is generating a verifiable random seed. The pool is temporarily locked.</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Winner Spotlight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="text-xs font-bold uppercase tracking-widest text-white/30">Registry Outcome</div>
                    </div>
                    <div className="space-y-1">
                        <div className="text-2xl font-bold truncate">
                            {contractData?.recentWinner || "Genesis State"}
                        </div>
                        <div className="text-xs font-mono text-purple-400 uppercase">Recent Victor Address</div>
                    </div>
                    <button className="mt-8 text-[10px] font-bold text-white/20 hover:text-white transition-colors flex items-center gap-2">
                        SCAN ON ETHERSCAN <ExternalLink className="w-3 h-3" />
                    </button>
                </div>

                <div className="p-8 rounded-[2rem] bg-blue-500/5 border border-blue-500/10 hover:border-blue-500/20 transition-all relative overflow-hidden">
                    <div className="absolute top-[-50%] right-[-30%] w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full" />
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex items-center justify-between">
                             <div className="text-xs font-bold uppercase tracking-widest text-white/30">Protocol Info</div>
                             <Activity className="w-4 h-4 text-blue-400" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-4xl font-black">{contractData?.interval || 30}s</span>
                                <span className="text-xs text-white/40 uppercase font-bold leading-none">Rotation <br /> Cycle</span>
                            </div>
                            <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-blue-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(timeLeft / (contractData?.interval || 30)) * 100}%` }}
                                    transition={{ duration: 1 }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </motion.div>

          {/* Sidebar Area (4 columns) */}
          <motion.div variants={itemVariants} className="lg:col-span-4 space-y-8">
            
            {/* Stats Vertical Grid */}
            <div className="space-y-6">
                <StatCard 
                    label="Net Pool Value" 
                    value={`${contractData?.poolBalance || "0"} ETH`} 
                    subValue={`Entry: ${contractData?.entranceFee || "0"} ETH`}
                    icon={<Coins className="w-5 h-5" />} 
                    color="text-white"
                />
                <StatCard 
                    label="Pool Velocity" 
                    value={String(contractData?.playersCount || 0)} 
                    subValue="Active Participants"
                    icon={<Users className="w-5 h-5" />} 
                />
                <StatCard 
                    label="Time Until Pick" 
                    value={formatTime(timeLeft)} 
                    subValue="Next distribution"
                    icon={<Clock className="w-5 h-5" />} 
                />
                <StatCard 
                    label="Grid Status" 
                    value={contractData?.raffleState === 0 ? "STABLE" : "SYNCING"} 
                    subValue={contractData?.raffleState === 0 ? "Open for entries" : "Selecting winner"}
                    icon={<Activity className="w-5 h-5" />} 
                    color={contractData?.raffleState === 0 ? "text-green-400" : "text-amber-500"}
                />
            </div>

            {/* Admin Portal (Conditional) */}
            <AnimatePresence>
                {showAdmin && isAdmin && (
                    <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="p-8 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/20 shadow-[0_0_50px_rgba(168,85,247,0.1)] space-y-6"
                    >
                        <div className="flex items-center gap-3 mb-2">
                            <Lock className="w-5 h-5 text-purple-400" />
                            <h3 className="font-black text-xl tracking-tighter uppercase italic">Control Grid</h3>
                        </div>

                        <AdminAction 
                            label="Register Protocol Entry" 
                            action={enterRaffle} 
                            loading={actionLoading} 
                            icon={<PlusCircle className="w-4 h-4" />}
                            description="Quick entry for testing/admin"
                        />
                        <AdminAction 
                            label="Initiate Pick" 
                            action={triggerWinner} 
                            loading={actionLoading} 
                            icon={<RefreshCcw className="w-4 h-4" />}
                            description="Force trigger performUpkeep"
                        />
                        <AdminAction 
                            label="Inject VRF Funder" 
                            action={fundVRF} 
                            loading={actionLoading} 
                            icon={<PlusCircle className="w-4 h-4" />}
                            description="Add native ETH to VRF"
                        />
                         <AdminAction 
                            label="Emergency Sync" 
                            action={emergencyReset} 
                            loading={actionLoading} 
                            icon={<Activity className="w-4 h-4" />}
                            description="Force state to OPEN"
                            danger
                        />
                    </motion.div>
                )}
            </AnimatePresence>
          </motion.div>
        </motion.div>

        {/* Participant Registry Section */}
        <motion.div variants={itemVariants} className="mt-16 space-y-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tighter uppercase italic">Participant Registry</h2>
                </div>
                <div className="text-[10px] font-bold text-white/30 uppercase tracking-[0.3em]">Transparent Pool Data</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                    {contractData?.players && contractData.players.length > 0 ? (
                        contractData.players.map((player, idx) => (
                            <motion.div 
                                key={`${player}-${idx}`}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-purple-500/20 transition-all"
                            >
                                <div className="flex items-center gap-4 overflow-hidden">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[10px] font-bold text-white/20 group-hover:text-purple-400 group-hover:bg-purple-500/10 transition-all">
                                        {idx + 1}
                                    </div>
                                    <div className="font-mono text-xs text-white/60 truncate group-hover:text-white transition-colors">
                                        {player}
                                    </div>
                                </div>
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            </motion.div>
                        ))
                    ) : (
                        <div className="col-span-full py-20 rounded-[2.5rem] bg-white/5 border border-dashed border-white/10 flex flex-col items-center justify-center text-center space-y-2 opacity-50">
                            <Users className="w-8 h-8 text-white/20" />
                            <p className="font-bold uppercase tracking-widest text-[10px]">No Active Participants Found</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>

        {/* Global Notifications */}
        <AnimatePresence>
            {message && (
                <motion.div 
                    initial={{ opacity: 0, y: 50, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="fixed bottom-12 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm"
                >
                    <div className={`p-5 rounded-2xl backdrop-blur-3xl border shadow-2xl flex items-center justify-between gap-4 ${
                        message.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-100' :
                        message.type === 'success' ? 'bg-green-500/20 border-green-500/30 text-green-100' :
                        'bg-purple-500/20 border-purple-500/30 text-purple-100'
                    }`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="flex-shrink-0">
                                {message.type === 'error' ? <Lock className="w-5 h-5 text-red-400" /> : <Sparkles className="w-5 h-5 text-purple-400" />}
                            </div>
                            <span className="text-sm font-semibold truncate leading-tight">{message.text}</span>
                        </div>
                        <button onClick={() => setMessage(null)} className="opacity-40 hover:opacity-100 text-xs font-bold transition-opacity flex-shrink-0">DISMISS</button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      {/* Interactive Noise Texture */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] contrast-150 z-[5] mix-blend-overlay noise-bg" />
      
      <footer className="relative z-10 py-12 px-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between text-white/20 text-[10px] font-bold tracking-[0.2em] uppercase max-w-7xl mx-auto w-full">
         <div className="flex items-center gap-4">
             <span>REFLECT PROTOCOL CORE</span>
             <span className="w-1 h-1 rounded-full bg-white/20" />
             <span>VERIFIABLE AUTONOMY v2.5</span>
         </div>
         <div className="flex gap-8 mt-6 md:mt-0">
             <a href="#" className="hover:text-purple-400 transition-colors">Nodes</a>
             <a href="#" className="hover:text-purple-400 transition-colors">Security</a>
             <a href="#" className="hover:text-purple-400 transition-colors">GitHub</a>
         </div>
      </footer>
    </div>
  );
}

// --- Subcomponents ---

function StatCard({ label, value, subValue, icon, color = "text-purple-400" }: { label: string; value: string; subValue: string; icon: React.ReactNode; color?: string }) {
  return (
    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 transition-all group relative overflow-hidden">
      <div className="absolute top-0 right-0 p-6 opacity-[0.1] -rotate-12 group-hover:rotate-0 transition-transform duration-500">
          {icon}
      </div>
      <div className="relative z-10 space-y-4">
        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">{label}</div>
        <div className="space-y-1">
            <div className={`text-4xl font-black tracking-tighter ${color}`}>{value}</div>
            <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest">{subValue}</div>
        </div>
      </div>
    </div>
  );
}

function AdminAction({ label, action, loading, icon, description, danger = false }: { label: string; action: () => void; loading: boolean; icon: React.ReactNode; description: string; danger?: boolean }) {
  return (
    <button 
        onClick={action}
        disabled={loading}
        className={`w-full p-5 rounded-2xl border transition-all text-left flex items-start gap-4 active:scale-[0.98] disabled:opacity-50 ${
            danger ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-purple-500/30'
        }`}
    >
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/20 text-red-400' : 'bg-purple-500/20 text-purple-400'}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
        </div>
        <div className="space-y-1 overflow-hidden">
            <div className={`text-sm font-black uppercase italic tracking-tighter ${danger ? 'text-red-400' : 'text-white'}`}>{label}</div>
            <div className="text-[10px] font-medium text-white/30 uppercase tracking-widest truncate">{description}</div>
        </div>
    </button>
  );
}
