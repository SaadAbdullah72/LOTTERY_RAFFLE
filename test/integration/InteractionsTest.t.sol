// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {Raffle} from "../../src/Raffle.sol";
import {Test, console2} from "forge-std/Test.sol";
import {DeployRaffle} from "../../script/DeployRaffle.s.sol";
import {HelperConfig} from "../../script/HelperConfig.s.sol";
import {VRFCoordinatorV2_5Mock} from "@chainlink/contracts/src/v0.8/vrf/mocks/VRFCoordinatorV2_5Mock.sol";
import {Vm} from "forge-std/Vm.sol";

/**
 * @title InteractionsTest
 * @notice Full integration test (enterRaffle -> upkeep -> VRF fulfill)
 */
contract InteractionsTest is Test {
    /* Events */
    event RaffleEntered(address indexed player);
    event WinnerPicked(address indexed winner);
    event RequestRaffleWinner(uint256 indexed requestId);

    Raffle public raffle;
    address public PLAYER = makeAddr("PLAYER");
    uint256 public constant STARTING_BALANCE = 100000000000000 ether;
    uint256 public constant ENTRANCE_FEE = 0.1 ether;
    uint256 public constant INTERVAL = 30;
    address public newVRFCoordinator;

    function setUp() external {
        DeployRaffle deployRaffle = new DeployRaffle();
        HelperConfig helperConfig;
        (raffle, helperConfig) = deployRaffle.run();

        // Récupère l'adresse du VRF mock depuis la config
        newVRFCoordinator = helperConfig.getConfig().vrfCoordinator;

        // Donne un solde à PLAYER
        vm.deal(PLAYER, STARTING_BALANCE);
    }

    /**
     * @notice Test complet : on entre dans la loterie,
     * si upkeepNeeded => on performUpkeep,
     * puis on fulfillRandomWords, etc.
     */
    function testUserCanEnterRaffleAndHaveAChanceToWin() public {
        for (uint256 i = 0; i < 4; i++) {
            console2.log("======== Cycle:", i);

            uint256 numberOfPlayers = 3; // Several players enter the raffle
            address[] memory players = new address[](numberOfPlayers);

            // ─── Multiple players enter the lottery ──────────────────────────────
            for (uint256 j = 0; j < numberOfPlayers; j++) {
                address newPlayer = address(uint160(j + 1000)); // Generate unique addresses
                vm.deal(newPlayer, STARTING_BALANCE); // Fund the player
                vm.prank(newPlayer); // Set the next transaction sender to newPlayer
                raffle.enterRaffle{value: ENTRANCE_FEE}(); // Player enters the raffle
                players[j] = newPlayer; // Store player's address
            }

            vm.warp(block.timestamp + INTERVAL + 1);
            vm.roll(block.number + 1);

            (bool upkeepNeeded,) = raffle.checkUpkeep("");
            console2.log("Upkeep needed:", upkeepNeeded);

            if (upkeepNeeded) {
                // ─── Perform Upkeep ──────────────────────────────────────────────
                vm.recordLogs();
                console2.log("Performing upkeep...");
                raffle.performUpkeep("");
                Vm.Log[] memory logsUpkeep = vm.getRecordedLogs();
                console2.log("Logs after performUpkeep:", logsUpkeep.length);

                // ─── Retrieve requestId from RequestRaffleWinner event ──────────
                bytes32 requestId = _findRequestRaffleWinner(logsUpkeep);

                // ─── Verify contract state after upkeep ─────────────────────────
                uint256 rState = uint256(raffle.getRaffleState());
                console2.log("Raffle state after upkeep:", rState);
                require(rState == 1, "Raffle should be CALCULATING after upkeep");

                // ─── Fulfill random words with the correct requestId ─────────────
                console2.log("Fulfilling random words with requestId:");
                console2.logBytes32(requestId);
                vm.recordLogs();
                VRFCoordinatorV2_5Mock(newVRFCoordinator).fulfillRandomWords(uint256(requestId), address(raffle));
                Vm.Log[] memory logsFulfill = vm.getRecordedLogs();
                console2.log("Logs after fulfillRandomWords:", logsFulfill.length);

                // ─── Verify WinnerPicked event ────────────────────────────────────
                _checkWinnerPicked(logsFulfill);

                // ─── Verify winner and that players array is reset ────────────────
                address recentWinner = raffle.getRecentWinner();
                require(recentWinner != address(0), "Winner address not set");
                address payable[] memory playersAfter = raffle.gets_players();
                require(playersAfter.length == 0, "Players array not reset");

                // ─── Verify fund distribution ─────────────────────────────────────
                // Calculate the total funds collected
                uint256 totalPrizePool = ENTRANCE_FEE * numberOfPlayers;
                // Winner should receive 90% of the prize pool
                uint256 expectedWinnerAmount = (totalPrizePool * 90) / 100;
                // Owner should receive at least 8% of the prize pool
                uint256 minOwnerAmount = (totalPrizePool * 8) / 100;

                uint256 winnerFinalBalance = recentWinner.balance;
                address raffleOwner = tx.origin; // Owner set in the deployment script
                uint256 ownerFinalBalance = raffleOwner.balance;

                require(winnerFinalBalance >= expectedWinnerAmount, "Winner did not receive enough funds");
                require(ownerFinalBalance >= minOwnerAmount, "Owner did not receive enough funds");
            } else {
                // ─── Expect revert if upkeepNeeded == false ──────────────────────
                console2.log("Expect revert UpkeepNotNeeded");
                vm.expectRevert(Raffle.Raffle__UpkeepNotNeeded.selector);
                raffle.performUpkeep("");
            }
        }
    }

    /**
     * @notice Parcourt les logs pour trouver l'event RequestRaffleWinner
     * @return requestId Extrait de topics[1] si trouvé
     */
    function _findRequestRaffleWinner(Vm.Log[] memory logsArr) internal pure returns (bytes32 requestId) {
        bytes32 topic = keccak256("RequestRaffleWinner(uint256)");
        for (uint256 i = 0; i < logsArr.length; i++) {
            if (logsArr[i].topics[0] == topic) {
                return logsArr[i].topics[1];
            }
        }
        revert("RequestRaffleWinner event not found");
    }

    /**
     * @notice Vérifie l'event WinnerPicked(address) dans logsFulfill
     */
    function _checkWinnerPicked(Vm.Log[] memory logsFulfill) internal {
        bytes32 topic = keccak256("WinnerPicked(address)");
        bool found = false;
        for (uint256 i = 0; i < logsFulfill.length; i++) {
            if (logsFulfill[i].topics[0] == topic) {
                found = true;
                break;
            }
        }
        require(found, "WinnerPicked event not emitted");
    }
}
