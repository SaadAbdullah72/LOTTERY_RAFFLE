
 **LOTTERY_RAFFLE  (Smart Contract)**

A fully decentralized, verifiable random lottery smart contract built with **Solidity**, powered by **Foundry** and **Chainlink VRF v2**.



 **Overview**

This project is a blockchain-based lottery raffle system that:
- Allows users to enter the lottery with ETH
- Uses Chainlink VRF for provably fair randomness
- Automatically selects a random winner
- Sends the total ETH to the winner

---

 Tech Stack

- ⚙️ **Solidity** — Smart contract language
- 🧪 **Foundry** — Development, testing, and deployment framework
- 🔗 **Chainlink VRF v2** — For secure random number generation
- 🧱 **Sepolia Testnet** — Network used for testing
- 💼 **Etherscan** — For contract verification

---

## 📦 Project Structure

```bash
.
├── contracts/
│   └── Raffle.sol            # Main Lottery Contract
├── script/
│   └── DeployRaffle.s.sol    # Deployment Script
├── test/
│   └── Raffle.t.sol          # Unit Tests
├── foundry.toml              # Foundry Config File
└── README.md
````

---

## 📋 How It Works

1. Users enter the lottery by sending ETH to the contract.
2. Once enough participants join or time ends, Chainlink VRF requests a random number.
3. A winner is selected fairly and the total ETH is transferred.
4. The cycle restarts automatically.

---

## 💻 VS Code Setup

### Step 1 — Install Required Extensions

Open VS Code and install these extensions:

| Extension | Publisher | Purpose |
|-----------|-----------|---------|
| **Solidity** | Nomic Foundation (`NomicFoundation.hardhat-solidity`) | Syntax highlighting, IntelliSense, error checking |
| **Even Better TOML** | tamasfe | Syntax highlighting for `foundry.toml` |

> Install via the Extensions sidebar (`Ctrl+Shift+X`) or run in the terminal:
> ```bash
> code --install-extension NomicFoundation.hardhat-solidity
> code --install-extension tamasfe.even-better-toml
> ```

### Step 2 — Open the Project

```bash
# Clone the repo (if you haven't already)
git clone https://github.com/SaadAbdullah72/LOTTERY_RAFFLE.git
cd LOTTERY_RAFFLE

# Open in VS Code
code .
```

### Step 3 — VS Code is Pre-Configured ✅

A `.vscode/settings.json` file is already included in this repo. It automatically:
- Points the Solidity extension to the correct `lib/` folder for dependencies
- Sets up the correct **remappings** for `@chainlink` and `@solmate` imports
- Enables **format on save** for `.sol` files
- Uses **Solidity v0.8.19** for compilation

### Step 4 — Install Foundry (for building/testing)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### Step 5 — Install Dependencies

```bash
forge install
```

### Step 6 — Build & Test from VS Code Terminal

Open the integrated terminal (`Ctrl+\``) and run:

```bash
forge build   # Compile contracts
forge test    # Run tests
```

---

## 🧪 Local Development

### ✅ Prerequisites

* [Foundry](https://book.getfoundry.sh/getting-started/installation) installed
* Chainlink credentials:

  * `SEPOLIA_RPC_URL`
  * `PRIVATE_KEY`
  * `VRF_COORDINATOR`
  * `SUBSCRIPTION_ID`
  * `LINK_TOKEN`

### ⚙️ Compile

```bash
forge build
```

### 🧪 Run Tests

```bash
forge test
```

### 🚀 Deploy

```bash
forge script script/DeployRaffle.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --verify --chain-id 11155111
```

---

## 🔐 Security

* Verifiable randomness (VRF v2) ensures unbiased winner selection.
* Contract is gas-optimized and follows best practices.
* Fully tested using Foundry.



## 📄 License

MIT License. Free to use and modify with credit.



## 🙌 Credits

* [Chainlink](https://chain.link/)
* [Foundry](https://book.getfoundry.sh/)
* Developed by [Saad Abdullah](https://github.com/SaadAbdullah72)


