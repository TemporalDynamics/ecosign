function isSemverLike(version) {
  return typeof version === "string" && /^\d+\.\d+\.\d+$/.test(version);
}

export function evaluateProtocol({ metadata, releaseMode }) {
  const protocolVersionChanged = Boolean(metadata?.protocol_version_changed);
  const protocolVersion = metadata?.protocol_version;

  if (!releaseMode) {
    return { protocol_version_ok: true };
  }

  const hasValidVersion = isSemverLike(protocolVersion);
  return {
    protocol_version_ok: protocolVersionChanged && hasValidVersion,
  };
}
