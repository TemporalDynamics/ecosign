// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VerifySign Document Anchor
 * @notice Smart contract para anclar hashes de documentos en Polygon
 * @dev Registra hashes SHA-256 inmutablemente en blockchain
 */
contract VerifySignAnchor {

    struct Anchor {
        uint256 timestamp;    // Cuándo se registró
        address anchorer;     // Quién lo registró
        bool exists;          // Si existe o no
    }

    // Mapeo de hash → anchor data
    mapping(bytes32 => Anchor) public anchors;

    // Array de todos los hashes (para auditoría)
    bytes32[] public anchoredHashes;

    // Eventos
    event HashAnchored(
        bytes32 indexed documentHash,
        address indexed anchorer,
        uint256 timestamp
    );

    /**
     * @notice Anclar un hash de documento en blockchain
     * @param documentHash Hash SHA-256 del documento (bytes32)
     * @return timestamp Timestamp del bloque
     */
    function anchorHash(bytes32 documentHash) external returns (uint256) {
        require(documentHash != bytes32(0), "Hash cannot be zero");
        require(!anchors[documentHash].exists, "Hash already anchored");

        uint256 timestamp = block.timestamp;

        anchors[documentHash] = Anchor({
            timestamp: timestamp,
            anchorer: msg.sender,
            exists: true
        });

        anchoredHashes.push(documentHash);

        emit HashAnchored(documentHash, msg.sender, timestamp);

        return timestamp;
    }

    /**
     * @notice Verificar si un hash está anclado
     * @param documentHash Hash a verificar
     * @return timestamp Timestamp del anclaje
     * @return anchorer Dirección que lo ancló
     * @return exists Si existe o no
     */
    function getAnchor(bytes32 documentHash)
        external
        view
        returns (uint256 timestamp, address anchorer, bool exists)
    {
        Anchor memory anchor = anchors[documentHash];
        return (anchor.timestamp, anchor.anchorer, anchor.exists);
    }

    /**
     * @notice Verificar si un hash existe (método simple)
     * @param documentHash Hash a verificar
     * @return Verdadero si está anclado
     */
    function isAnchored(bytes32 documentHash) external view returns (bool) {
        return anchors[documentHash].exists;
    }

    /**
     * @notice Obtener el total de hashes anclados
     * @return Número total de hashes
     */
    function getTotalAnchors() external view returns (uint256) {
        return anchoredHashes.length;
    }

    /**
     * @notice Obtener hash por índice (para paginación)
     * @param index Índice en el array
     * @return Hash en esa posición
     */
    function getHashByIndex(uint256 index) external view returns (bytes32) {
        require(index < anchoredHashes.length, "Index out of bounds");
        return anchoredHashes[index];
    }

    /**
     * @notice Verificar múltiples hashes a la vez
     * @param hashes Array de hashes a verificar
     * @return results Array de booleanos indicando si cada hash está anclado
     */
    function batchVerify(bytes32[] calldata hashes)
        external
        view
        returns (bool[] memory results)
    {
        results = new bool[](hashes.length);
        for (uint256 i = 0; i < hashes.length; i++) {
            results[i] = anchors[hashes[i]].exists;
        }
        return results;
    }
}
