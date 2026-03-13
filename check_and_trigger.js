const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Read constants from constants.ts
const constantsPath = path.join(__dirname, 'frontend', 'src', 'constants.ts');
const constantsContent = fs.readFileSync(constantsPath, 'utf8');

const contractAddressMatch = constantsContent.match(/export const contractAddress = "(.*)";/);
const contractAddress = contractAddressMatch ? contractAddressMatch[1] : "";

const abiMatch = constantsContent.match(/export const abi = (\[[\s\S]*\]);/);
const abi = abiMatch ? JSON.parse(abiMatch[1]) : [];

const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(contractAddress, abi, wallet);

async function main() {
    console.log("Checking project status...");
    console.log("Contract Address:", contractAddress);
    
    // Check balance
    const balance = await provider.getBalance(wallet.address);
    console.log("Wallet Balance:", ethers.formatUnits(balance, "ether"), "ETH");

    if (balance === 0n) {
        console.error("No funds in wallet. Please fund your wallet first.");
        return;
    }

    // Check raffle state
    const state = await contract.getRaffleState();
    const playersCount = (await contract.gets_players()).length;
    const lastTS = await contract.getLastTimeStamp();
    const interval = await contract.getInterval();
    const now = Math.floor(Date.now() / 1000);
    const timePassed = (now - Number(lastTS)) >= Number(interval);

    console.log("Raffle State:", Number(state) === 0 ? "OPEN" : "CALCULATING");
    console.log("Players Count:", playersCount);
    console.log("Time Passed:", timePassed);
    console.log("Now:", now, "LastTS:", Number(lastTS), "Interval:", Number(interval));

    if (Number(state) === 0 && playersCount > 0 && timePassed) {
        console.log("Conditions met! Triggering winner pick (performUpkeep)...");
        try {
            const tx = await contract.performUpkeep("0x");
            console.log("Transaction sent! Hash:", tx.hash);
            await tx.wait();
            console.log("Transaction confirmed! Winner selection in progress...");
        } catch (err) {
            console.error("Error triggering upkeep:", err.message);
        }
    } else {
        console.log("Conditions not met yet. Raffle stays OPEN.");
        if (playersCount === 0) console.log("Missing players.");
        if (!timePassed) console.log("Time hasn't passed yet.");
    }
}

main().catch(console.error);
