Here’s a **professional, clean, and impressive `README.md`** for your **Blockchain Lottery Project** using **Foundry, Chainlink VRF, and Solidity**:

---

````markdown
# 🎰 Lottery Raffle Smart Contract

A fully decentralized, verifiable random lottery smart contract built with **Solidity**, powered by **Foundry** and **Chainlink VRF v2**.

---

## 🚀 Overview

This project is a blockchain-based lottery raffle system that:
- Allows users to enter the lottery with ETH
- Uses Chainlink VRF for provably fair randomness
- Automatically selects a random winner
- Sends the total ETH to the winner

---

## 🛠 Tech Stack

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


