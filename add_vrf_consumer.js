const { ethers } = require('ethers');
require('dotenv').config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const VRF_COORDINATOR_ADDRESS = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const SUB_ID = "15993839906387054297531610053355364271225837432935631693595241318358973806335";
const CONSUMER_ADDRESS = "0x30a07FC174992EE70f745088cb9cbeD672aE619A";

const VRF_COORDINATOR_ABI = [
    "function addConsumer(uint256 subId, address consumer) external"
];

async function main() {
    console.log(`Adding consumer ${CONSUMER_ADDRESS} to subscription ${SUB_ID}...`);
    
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR_ADDRESS, VRF_COORDINATOR_ABI, wallet);
    
    try {
        const tx = await vrfCoordinator.addConsumer(SUB_ID, CONSUMER_ADDRESS);
        console.log("Transaction sent. Waiting for confirmation...");
        await tx.wait();
        console.log("Success! Consumer added to subscription.");
    } catch (error) {
        console.error("Error adding consumer:", error.message);
        if (error.message.includes("Only callable by subscription owner")) {
            console.error("Note: This error usually means the private key provided is not the owner of the subscription.");
        }
    }
}

main().catch(console.error);
