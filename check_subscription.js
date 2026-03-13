const { ethers } = require('ethers');
require('dotenv').config();

const VRF_COORDINATOR_ADDRESS = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const VRF_COORDINATOR_ABI = [
    "function getSubscription(uint256 subId) external view returns (uint96 balance, uint96 nativeBalance, uint64 reqCount, address owner, address[] memory consumers)"
];

const subId = "15993839906387054297531610053355364271225837432935631693595241318358973806335";
const consumerAddress = "0x30a07FC174992EE70f745088cb9cbeD672aE619A";

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const coordinator = new ethers.Contract(VRF_COORDINATOR_ADDRESS, VRF_COORDINATOR_ABI, provider);
    
    console.log("Checking Subscription ID:", subId);
    
    try {
        const sub = await coordinator.getSubscription(subId);
        console.log(`Balance (LINK): ${ethers.formatEther(sub.balance)} LINK`);
        console.log(`Native Balance (ETH): ${ethers.formatEther(sub.nativeBalance)} ETH`);
        console.log(`Request Count: ${sub.reqCount}`);
        console.log(`Owner: ${sub.owner}`);
        console.log(`Consumers: ${sub.consumers.join(', ')}`);
        
        const isConsumer = sub.consumers.map(c => c.toLowerCase()).includes(consumerAddress.toLowerCase());
        console.log(`Is our contract a consumer? ${isConsumer}`);
        
    } catch (err) {
        console.error("Error fetching subscription:", err.message);
    }
}

main().catch(console.error);
