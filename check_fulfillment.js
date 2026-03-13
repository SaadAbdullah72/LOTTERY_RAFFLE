const { ethers } = require('ethers');
require('dotenv').config();

const VRF_COORDINATOR_ADDRESS = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
const VRF_COORDINATOR_ABI = [
    "event RandomWordsFulfilled(uint256 indexed requestId, uint256 outputSeed, uint256 payment, bool success)"
];

const requestId = "92151389218230977793045523921449166153666944541724872409809834197049922657925";

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const coordinator = new ethers.Contract(VRF_COORDINATOR_ADDRESS, VRF_COORDINATOR_ABI, provider);
    
    const block = await provider.getBlockNumber();
    console.log("Checking VRF Coordinator for fulfillment of ID:", requestId);
    
    const filter = coordinator.filters.RandomWordsFulfilled(requestId);
    const events = await coordinator.queryFilter(filter, block - 1000);
    
    if (events.length > 0) {
        const e = events[0];
        console.log(`Fulfillment found in block: ${e.blockNumber}`);
        console.log(`Success: ${e.args.success}`);
        console.log(`Payment: ${ethers.formatEther(e.args.payment)} ETH`);
    } else {
        console.log("No fulfillment found in the last 1000 blocks. Request is still pending or coordinator hasn't processed it.");
    }
}

main().catch(console.error);
