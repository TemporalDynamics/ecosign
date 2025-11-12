// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TimestampRegistry {
    // Mapping: hash => timestamp
    mapping(bytes32 => uint256) public timestamps;

    // Mapping: hash => block number
    mapping(bytes32 => uint256) public blockNumbers;

    // Events
    event Timestamped(
        bytes32 indexed documentHash,
        uint256 timestamp,
        uint256 blockNumber,
        address indexed submitter
    );

    /**
     * Register a document hash
     */
    function register(bytes32 documentHash) public {
        require(timestamps[documentHash] == 0, "Already timestamped");

        timestamps[documentHash] = block.timestamp;
        blockNumbers[documentHash] = block.number;

        emit Timestamped(
            documentHash,
            block.timestamp,
            block.number,
            msg.sender
        );
    }

    /**
     * Verify if hash is registered
     */
    function verify(bytes32 documentHash) public view returns (
        bool exists,
        uint256 timestamp,
        uint256 blockNumber
    ) {
        exists = timestamps[documentHash] != 0;
        timestamp = timestamps[documentHash];
        blockNumber = blockNumbers[documentHash];
    }

    /**
     * Batch register multiple hashes
     */
    function registerBatch(bytes32[] memory hashes) public {
        for (uint i = 0; i < hashes.length; i++) {
            if (timestamps[hashes[i]] == 0) {
                timestamps[hashes[i]] = block.timestamp;
                blockNumbers[hashes[i]] = block.number;

                emit Timestamped(
                    hashes[i],
                    block.timestamp,
                    block.number,
                    msg.sender
                );
            }
        }
    }
}