// scripts/deploy.js
async function main() {
  console.log("🚀 Deploying TimestampRegistry...");

  const TimestampRegistry = await ethers.getContractFactory("TimestampRegistry");
  const registry = await TimestampRegistry.deploy();

  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log("✅ Deployed to:", address);
  console.log("Save this address!");

  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });