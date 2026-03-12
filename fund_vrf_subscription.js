const { ethers } = require('ethers');
require('dotenv').config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const VRF_COORDINATOR_ADDRESS = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const SUB_ID = "57477411089376650331325719424898120969927413020599882309981248136647699979416";

const VRF_COORDINATOR_ABI = [
    "function fundSubscriptionWithNative(uint256 subId) external payable"
];

async function main() {
    console.log(`Funding subscription ${SUB_ID} with 0.05 Sepolia ETH...`);
    
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR_ADDRESS, VRF_COORDINATOR_ABI, wallet);
    
    try {
        const tx = await vrfCoordinator.fundSubscriptionWithNative(SUB_ID, {
            value: ethers.parseEther("0.05")
        });
        console.log("Transaction sent. Waiting for confirmation...");
        await tx.wait();
        console.log("Success! Subscription funded.");
    } catch (error) {
        console.error("Error funding subscription:", error.message);
    }
}

main().catch(console.error);
