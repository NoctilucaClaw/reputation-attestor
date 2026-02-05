// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AttestationRegistry
 * @notice On-chain anchor for Agent Attestation Protocol (AAP) attestations.
 * @dev Stores SHA-256 content hashes of signed attestations. Full payloads live off-chain.
 * @author Noctiluca (NoctilucaClaw)
 */
contract AttestationRegistry {
    struct Anchor {
        bytes32 contentHash;
        bytes32 agentId;
        string  attestationType;
        uint256 timestamp;
        address submitter;
    }

    /// contentHash => Anchor
    mapping(bytes32 => Anchor) public anchors;

    /// agentId => contentHash[]
    mapping(bytes32 => bytes32[]) public agentAnchors;

    /// Total anchored attestations
    uint256 public totalAnchors;

    event AttestationAnchored(
        bytes32 indexed contentHash,
        bytes32 indexed agentId,
        string attestationType,
        address submitter
    );

    /**
     * @notice Anchor an attestation's content hash on-chain.
     * @param contentHash SHA-256 hash of the canonical attestation JSON
     * @param agentId keccak256(agent-slug)
     * @param attestationType Type string (e.g., "github_pr_merged")
     */
    function anchor(
        bytes32 contentHash,
        bytes32 agentId,
        string calldata attestationType
    ) external {
        require(anchors[contentHash].timestamp == 0, "Already anchored");

        anchors[contentHash] = Anchor({
            contentHash: contentHash,
            agentId: agentId,
            attestationType: attestationType,
            timestamp: block.timestamp,
            submitter: msg.sender
        });

        agentAnchors[agentId].push(contentHash);
        totalAnchors++;

        emit AttestationAnchored(contentHash, agentId, attestationType, msg.sender);
    }

    /**
     * @notice Batch anchor multiple attestations.
     */
    function anchorBatch(
        bytes32[] calldata contentHashes,
        bytes32[] calldata agentIds,
        string[] calldata attestationTypes
    ) external {
        require(
            contentHashes.length == agentIds.length &&
            agentIds.length == attestationTypes.length,
            "Array length mismatch"
        );

        for (uint256 i = 0; i < contentHashes.length; i++) {
            if (anchors[contentHashes[i]].timestamp == 0) {
                anchors[contentHashes[i]] = Anchor({
                    contentHash: contentHashes[i],
                    agentId: agentIds[i],
                    attestationType: attestationTypes[i],
                    timestamp: block.timestamp,
                    submitter: msg.sender
                });
                agentAnchors[agentIds[i]].push(contentHashes[i]);
                totalAnchors++;
                emit AttestationAnchored(contentHashes[i], agentIds[i], attestationTypes[i], msg.sender);
            }
        }
    }

    /**
     * @notice Check if an attestation is anchored.
     */
    function isAnchored(bytes32 contentHash) external view returns (bool) {
        return anchors[contentHash].timestamp > 0;
    }

    /**
     * @notice Get all anchor hashes for an agent.
     */
    function getAgentAnchors(bytes32 agentId) external view returns (bytes32[] memory) {
        return agentAnchors[agentId];
    }

    /**
     * @notice Get anchor count for an agent.
     */
    function getAnchorCount(bytes32 agentId) external view returns (uint256) {
        return agentAnchors[agentId].length;
    }
}
