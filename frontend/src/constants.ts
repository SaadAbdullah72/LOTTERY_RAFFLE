export const contractAddress = "0xFD93f996dc17Ff5951dADfc76091faFa686398fE"; // User needs to update this after deploying
export const abi = [
    {
      "type": "constructor",
      "inputs": [
        { "name": "entranceFee", "type": "uint256", "internalType": "uint256" },
        { "name": "interval", "type": "uint256", "internalType": "uint256" },
        { "name": "vrfCoordinator", "type": "address", "internalType": "address" },
        { "name": "gasLane", "type": "bytes32", "internalType": "bytes32" },
        { "name": "callbackGasLimit", "type": "uint32", "internalType": "uint32" },
        { "name": "subscriptionId", "type": "uint256", "internalType": "uint256" },
        { "name": "raffleOwnerAddress", "type": "address", "internalType": "address" }
      ],
      "stateMutability": "nonpayable"
    },
    {
      "type": "function",
      "name": "enterRaffle",
      "inputs": [],
      "outputs": [],
      "stateMutability": "payable"
    },
    {
      "type": "function",
      "name": "getEntranceFee",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getLastTimeStamp",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getPlayer",
      "inputs": [{ "name": "indexOfPlayer", "type": "uint256", "internalType": "uint256" }],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getRaffleState",
      "inputs": [],
      "outputs": [{ "name": "", "type": "uint8", "internalType": "enum Raffle.RaffleState" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "getRecentWinner",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
      "stateMutability": "view"
    },
    {
      "type": "function",
      "name": "gets_players",
      "inputs": [],
      "outputs": [{ "name": "", "type": "address[]", "internalType": "address payable[]" }],
      "stateMutability": "view"
    }
];
