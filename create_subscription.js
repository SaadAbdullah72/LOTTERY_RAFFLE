const { ethers } = require('ethers');
require('dotenv').config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

const VRF_COORDINATOR_ADDRESS = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";

const VRF_COORDINATOR_ABI = [
    "function createSubscription() external returns (uint256 subId)",
    "event SubscriptionCreated(uint256 indexed subId, address owner)"
];

async function main() {
    console.log("Creating a new VRF subscription...");
    
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    
    const vrfCoordinator = new ethers.Contract(VRF_COORDINATOR_ADDRESS, VRF_COORDINATOR_ABI, wallet);
    
    try {
        const tx = await vrfCoordinator.createSubscription();
        console.log("Transaction sent. Waiting for confirmation...");
        const receipt = await tx.wait();
        
        // Find the event in the receipt
        const event = receipt.logs.find(log => {
             try {
                 const parsed = vrfCoordinator.interface.parseLog(log);
                 return parsed.name === 'SubscriptionCreated';
             } catch(e) { return false; }
        });
        
        if (event) {
            const parsed = vrfCoordinator.interface.parseLog(event);
            const subId = parsed.args.subId.toString();
            console.log("Success! New Subscription ID:", subId);
            require('fs').writeFileSync('new_sub_id.txt', subId);
        } else {
            console.log("Subscription created, but event not found in receipt.");
        }
    } catch (error) {
        console.error("Error creating subscription:", error.message);
    }
}

main().catch(console.error);
