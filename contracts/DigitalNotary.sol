// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DigitalNotary
 * @dev Contrato para anclaje de firmas digitales (Proof of Existence).
 * Funciona en Polygon, World Chain, Base, Ethereum, etc.
 */
contract DigitalNotary {

    // Estructura de datos para guardar la info del documento
    struct DocRecord {
        uint256 timestamp; // Cuándo se firmó
        address signer;    // Quién pagó el gas (la wallet que firma)
        bool exists;       // Para saber si ya está registrado
    }

    // Mapeo: Conectamos el HASH del documento con sus DATOS
    mapping(bytes32 => DocRecord) public records;

    // Evento: Esto es vital para que tu App "escuche" cuando algo se guarda
    event Anchored(bytes32 indexed docHash, address indexed signer, uint256 timestamp);

    /**
     * @notice Guarda un hash en la blockchain.
     * @param _docHash El hash SHA256 o Keccak256 del archivo.
     */
    function anchorDocument(bytes32 _docHash) external {
        // 1. Verificamos que no haya sido registrado antes (opcional, para evitar gastar gas doble)
        require(!records[_docHash].exists, "Este documento ya fue anclado anteriormente");

        // 2. Guardamos los datos
        records[_docHash] = DocRecord({
            timestamp: block.timestamp,
            signer: msg.sender,
            exists: true
        });

        // 3. Emitimos el evento para que quede el registro público fácil de leer
        emit Anchored(_docHash, msg.sender, block.timestamp);
    }

    /**
     * @notice Verifica si un documento existe y devuelve sus datos.
     * @param _docHash El hash a buscar.
     */
    function verifyDocument(bytes32 _docHash) external view returns (bool exists, uint256 timestamp, address signer) {
        DocRecord memory doc = records[_docHash];
        return (doc.exists, doc.timestamp, doc.signer);
    }
}
