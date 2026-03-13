const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const constantsPath = path.join(__dirname, 'frontend', 'src', 'constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');
const contractAddressMatch = constantsContent.match(/export const contractAddress = "(.*)";/);
const contractAddress = contractAddressMatch ? contractAddressMatch[1] : "";
const abiMatch = constantsContent.match(/export const abi = (\[[\s\S]*\]);/);
const abi = abiMatch ? JSON.parse(abiMatch[1]) : [];

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);

async function main() {
    const contract = new ethers.Contract(contractAddress, abi, provider);
    const block = await provider.getBlockNumber();
    
    console.log("Checking events from block:", block - 5000);
    
    const requestEvents = await contract.queryFilter(contract.filters.RequestRaffleWinner(), block - 5000);
    const winnerEvents = await contract.queryFilter(contract.filters.WinnerPicked(), block - 5000);

    console.log("RequestRaffleWinner Events:", requestEvents.length);
    requestEvents.forEach(e => {
        console.log(`Request ID: ${e.args[0]}, Block: ${e.blockNumber}`);
    });

    console.log("\nWinnerPicked Events:", winnerEvents.length);
    winnerEvents.forEach(e => {
        console.log(`Winner: ${e.args[0]}, Block: ${e.blockNumber}`);
    });

    if (requestEvents.length > 0) {
        const lastRequest = requestEvents[requestEvents.length - 1];
        const lastWinner = winnerEvents.length > 0 ? winnerEvents[winnerEvents.length - 1] : null;
        
        if (!lastWinner || lastWinner.blockNumber < lastRequest.blockNumber) {
            console.log("\nStatus: A request is PENDING fulfillment.");
            const requestId = lastRequest.args[0];
            console.log("Pending Request ID:", requestId);
        } else {
            console.log("\nStatus: Last request was fulfilled.");
        }
    } else {
        console.log("\nStatus: No requests found in the last 5000 blocks.");
    }
}

main().catch(console.error);
