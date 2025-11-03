import { useState, useEffect } from "react";
import { Button, Input, Text, Card, Alert, Code } from "@stellar/design-system";
import { useWallet } from "../hooks/useWallet";
import governanceClient, { makeGovernanceClient } from "../contracts/governance";
import xassetClient, { makeXassetClient } from "../contracts/xasset";
import { Box } from "../components/layout/Box";

export const GovernanceTest = () => {
  const [targetContractId, setTargetContractId] = useState<string>("");
  const [newValue, setNewValue] = useState<string>("");
  const [collateralRatio, setCollateralRatio] = useState<number | null>(null);
  const [isLoadingRatio, setIsLoadingRatio] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { address, signTransaction } = useWallet();

  // Default to xasset contract ID when component mounts
  useEffect(() => {
    if (!targetContractId && xassetClient.options.contractId) {
      setTargetContractId(xassetClient.options.contractId);
    }
  }, []);

  // Load current collateral ratio
  const loadCollateralRatio = async () => {
    if (!xassetClient.options.contractId) {
      setError("XAsset contract ID not available");
      return;
    }

    setIsLoadingRatio(true);
    setError(null);
    
    try {
      const readClient = makeXassetClient(address);
      const tx = await readClient.minimum_collateralization_ratio();
      
      // For read-only functions, result is directly the value (number)
      const result = tx.result as unknown;
      
      if (typeof result === "number") {
        setCollateralRatio(result);
        const percentage = result / 100;
        setSuccess(`Current collateral ratio: ${percentage}% (${result} basis points)`);
      } else if (
        result !== null &&
        typeof result === "object" &&
        "isErr" in result
      ) {
        // Handle Result type if present
        const resultObj = result as { isErr: () => boolean; unwrap: () => number; unwrapErr: () => unknown };
        if (resultObj.isErr()) {
          setError(`Error: ${resultObj.unwrapErr()}`);
        } else {
          const ratio = Number(resultObj.unwrap());
          setCollateralRatio(ratio);
          const percentage = ratio / 100;
          setSuccess(`Current collateral ratio: ${percentage}% (${ratio} basis points)`);
        }
      } else {
        setError("Unexpected response format");
      }
    } catch (err) {
      setError(`Failed to load collateral ratio: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsLoadingRatio(false);
    }
  };

  // Execute governance change
  const executeChange = async () => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }

    if (!targetContractId) {
      setError("Please enter a target contract ID");
      return;
    }

    const value = Number(newValue);
    if (isNaN(value) || value <= 0) {
      setError("Please enter a valid positive number for new value");
      return;
    }

    if (!signTransaction) {
      setError("Wallet signer not available");
      return;
    }

    setIsExecuting(true);
    setError(null);
    setSuccess(null);

    try {
      const authedClient = makeGovernanceClient(address);
      const tx = await authedClient.execute_change({
        contract: targetContractId,
        new_value: value,
      });

      // For write functions, need to call signAndSend()
      if (!signTransaction) {
        setError("Wallet signer not available");
        return;
      }

      const signed = await tx.signAndSend({ signTransaction });
      const result = signed.result as unknown;

      if (typeof result === "number") {
        setSuccess(`Successfully updated! Returned value: ${result} (${result / 100}%)`);
        // Reload collateral ratio after successful change
        await loadCollateralRatio();
      } else if (
        result !== null &&
        typeof result === "object" &&
        "isErr" in result
      ) {
        // Handle Result type if present
        const resultObj = result as { isErr: () => boolean; unwrap: () => number; unwrapErr: () => unknown };
        if (resultObj.isErr()) {
          setError(`Error: ${resultObj.unwrapErr()}`);
        } else {
          const returnedValue = Number(resultObj.unwrap());
          setSuccess(`Successfully updated! Returned value: ${returnedValue} (${returnedValue / 100}%)`);
          await loadCollateralRatio();
        }
      } else {
        setError("Unexpected response format");
      }
    } catch (err) {
      setError(`Failed to execute change: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecuting(false);
    }
  };

  if (!address) {
    return (
      <Alert variant="warning" placement="inline" title="Connect wallet">
        Please connect your wallet to interact with governance.
      </Alert>
    );
  }

  return (
    <Box gap="lg">
      {/* Current Collateral Ratio Card */}
      <Card variant="primary">
        <Box gap="md">
          <Box gap="xs">
            <Text as="h2" size="lg" weight="semi-bold">
              Current Collateral Ratio
            </Text>
            <Text as="p" size="sm" style={{ color: "var(--sds-clr-gray-600)" }}>
              View the current minimum collateralization ratio from the xasset contract.
            </Text>
          </Box>

          <Box gap="sm" direction="row" align="end">
            <Button
              variant="primary"
              size="md"
              onClick={() => void loadCollateralRatio()}
              disabled={isLoadingRatio}
            >
              {isLoadingRatio ? "Loading..." : "Refresh Ratio"}
            </Button>
            {collateralRatio !== null && (
              <Box gap="xs" direction="row" align="center">
                <Text as="p" size="md" weight="semi-bold">
                  Current Ratio:
                </Text>
                <Code size="md" style={{ fontSize: "1.1rem", padding: "0.5rem 1rem", backgroundColor: "var(--sds-clr-gray-01)", borderRadius: "4px" }}>
                  {collateralRatio} bp ({(collateralRatio / 100).toFixed(2)}%)
                </Code>
              </Box>
            )}
          </Box>
        </Box>
      </Card>

      {/* Execute Governance Change Card */}
      <Card variant="secondary">
        <Box gap="md">
          <Box gap="xs">
            <Text as="h2" size="lg" weight="semi-bold">
              Execute Governance Change
            </Text>
            <Text as="p" size="sm" style={{ color: "var(--sds-clr-gray-600)" }}>
              Update the minimum collateralization ratio through the governance contract.
              Value should be in basis points (e.g., 11000 = 110%, 15000 = 150%).
            </Text>
          </Box>
          
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void executeChange();
            }}
          >
            <Box gap="md">
              <Input
                label="Target Contract ID (xasset)"
                id="target-contract-id"
                fieldSize="md"
                value={targetContractId}
                onChange={(e) => setTargetContractId(e.target.value)}
                placeholder={xassetClient.options.contractId || "Enter contract ID"}
              />
              <Input
                label="New Value (basis points)"
                id="new-value"
                fieldSize="md"
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="e.g., 15000 for 150%"
                note="Enter the value in basis points (100 = 1%)"
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!targetContractId || !newValue || isExecuting}
              >
                {isExecuting ? "Executing..." : "Execute Change"}
              </Button>
            </Box>
          </form>
        </Box>
      </Card>

      {/* Messages */}
      {error && (
        <Alert variant="error" placement="inline" title="Error">
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" placement="inline" title="Success">
          {success}
        </Alert>
      )}

      {/* Contract Information Card */}
      <Card variant="secondary">
        <Box gap="sm">
          <Text as="h3" size="md" weight="semi-bold">
            Contract Information
          </Text>
          <Box gap="xs">
            <Box gap="xs" direction="row" align="center" wrap="wrap">
              <Text as="p" size="sm" style={{ color: "var(--sds-clr-gray-600)", minWidth: "180px" }}>
                <strong>Governance Contract:</strong>
              </Text>
              <Code size="sm" style={{ wordBreak: "break-all" }}>
                {governanceClient.options.contractId}
              </Code>
            </Box>
            <Box gap="xs" direction="row" align="center" wrap="wrap">
              <Text as="p" size="sm" style={{ color: "var(--sds-clr-gray-600)", minWidth: "180px" }}>
                <strong>XAsset Contract:</strong>
              </Text>
              <Code size="sm" style={{ wordBreak: "break-all" }}>
                {xassetClient.options.contractId}
              </Code>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
};

