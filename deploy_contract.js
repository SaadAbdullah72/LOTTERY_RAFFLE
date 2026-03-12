const fs = require('fs');
const path = require('path');
const solc = require('solc');
const { ethers } = require('ethers');
require('dotenv').config();

const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!SEPOLIA_RPC_URL || !PRIVATE_KEY) {
    console.error("Please provide SEPOLIA_RPC_URL and PRIVATE_KEY in .env file");
    process.exit(1);
}

function findImports(importPath) {
    let actualPath = importPath;
    if (importPath.startsWith('@chainlink/contracts/')) {
        actualPath = path.join(__dirname, 'lib', 'chainlink-brownie-contracts', 'contracts', importPath.replace('@chainlink/contracts/', ''));
    } else if (importPath.startsWith('forge-std/')) {
        actualPath = path.join(__dirname, 'lib', 'forge-std', 'src', importPath.replace('forge-std/', ''));
    } else if (importPath.startsWith('./') || importPath.startsWith('../')) {
        // Handle relative imports relative to the file that imported them? 
        // For simplicity, we assume they are handled by the compiler if we provide all sources, 
        // but solc callback is better.
    }

    try {
        const content = fs.readFileSync(actualPath, 'utf8');
        return { contents: content };
    } catch (e) {
        return { error: 'File not found: ' + actualPath };
    }
}

async function main() {
    console.log("Compiling Raffle.sol...");
    const rafflePath = path.join(__dirname, 'src', 'Raffle.sol');
    const source = fs.readFileSync(rafflePath, 'utf8');

    const input = {
        language: 'Solidity',
        sources: {
            'Raffle.sol': {
                content: source
            }
        },
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            outputSelection: {
                '*': {
                    '*': ['abi', 'evm.bytecode']
                }
            }
        }
    };

    // Callback to handle imports
    const findImportsResolved = (importPath) => {
        let fullPath = importPath;
        if (importPath.startsWith('@chainlink/contracts/')) {
            fullPath = path.resolve(__dirname, 'lib', 'chainlink-brownie-contracts', 'contracts', importPath.replace('@chainlink/contracts/', ''));
        } else if (importPath.startsWith('forge-std/')) {
            fullPath = path.resolve(__dirname, 'lib', 'forge-std', 'src', importPath.replace('forge-std/', ''));
        } else if (importPath.startsWith('solmate/')) {
            fullPath = path.resolve(__dirname, 'lib', 'solmate', 'src', importPath.replace('solmate/', ''));
        } else {
            // Assume relative to src/
            fullPath = path.resolve(__dirname, 'src', importPath);
            if (!fs.existsSync(fullPath)) {
                // Try relative to the lib interfaces etc
                fullPath = path.resolve(__dirname, 'lib', 'chainlink-brownie-contracts', 'contracts', 'src', 'v0.8', 'vrf', 'dev', importPath);
            }
        }

        try {
            return { contents: fs.readFileSync(fullPath, 'utf8') };
        } catch (e) {
            return { error: 'File not found: ' + fullPath };
        }
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImportsResolved }));

    if (output.errors) {
        output.errors.forEach(err => {
            console.error(err.formattedMessage);
        });
        if (output.errors.some(err => err.severity === 'error')) {
            process.exit(1);
        }
    }

    const contract = output.contracts['Raffle.sol']['Raffle'];
    const abi = contract.abi;
    const bytecode = contract.evm.bytecode.object;

    console.log("Deploying to Sepolia...");
    const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const factory = new ethers.ContractFactory(abi, bytecode, wallet);

    // Sepolia Config
    const entranceFee = ethers.parseEther("0.01");
    const interval = 30;
    const vrfCoordinator = "0x9DdfaCa8183c41ad55329BdeeD9F6A8d53168B1B";
    const gasLane = "0x787d74caea10b2b357790d5b5247c2f63d1d91572a9846f780606e4d953677ae";
    const callbackGasLimit = 500000;
    const subscriptionId = "15993839906387054297531610053355364271225837432935631693595241318358973806335";
    const raffleOwnerAddress = wallet.address;

    const raffle = await factory.deploy(
        entranceFee,
        interval,
        vrfCoordinator,
        gasLane,
        callbackGasLimit,
        subscriptionId,
        raffleOwnerAddress
    );

    console.log("Waiting for deployment...");
    await raffle.waitForDeployment();
    const address = await raffle.getAddress();

    console.log("Raffle deployed to:", address);

    // Write to a file for reference
    fs.writeFileSync('deployed_address.txt', address);

    // Update frontend constants
    const constantsPath = path.join(__dirname, 'frontend', 'src', 'constants.ts');
    let constantsContent = fs.readFileSync(constantsPath, 'utf8');
    constantsContent = constantsContent.replace(/export const contractAddress = ".*";/, `export const contractAddress = "${address}";`);
    constantsContent = constantsContent.replace(/export const abi = \[.*\];/s, `export const abi = ${JSON.stringify(abi, null, 4)};`);
    fs.writeFileSync(constantsPath, constantsContent);
    console.log("Updated frontend/src/constants.ts");
}

main().catch(console.error);
