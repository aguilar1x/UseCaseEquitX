# Governance Wrapper Contract

A minimal governance wrapper contract that demonstrates parameter updates in EquitX contracts.

**The contract only exposes one function: `execute_change()`**

## Features

- **Single Function**: One purpose-built function for governance actions
- **Admin Controlled**: Only authorized admin can execute changes  
- **Cross-Contract Calls**: Directly calls xasset contracts to update parameters
- **Minimal Design**: Simple, auditable, no complex voting overhead

## Contract Structure

### Constructor
```rust
pub fn __constructor(env: &Env, admin: Address)
```
Initializes the governance contract with an admin address.

### Functions

#### `execute_change(contract: Address, new_value: u32) -> u32`
Executes a governance change on the target contract.

**Parameters:**
- `contract`: Address of the xasset contract to update
- `new_value`: New value for `min_collat_ratio` (in basis points, 15000 = 150%)

**Returns:**
- `u32`: The new value set (confirmation)

**What it does:**
- Verifies caller is admin
- Calls `set_min_collat_ratio(new_value)` on the target xasset contract
- Returns the updated value

## Which Parameter Was Updated

### Target Parameter: `min_collat_ratio`

The governance contract updates the **Minimum Collateralization Ratio** in EquitX xasset contracts.

**What is `min_collat_ratio`?**
- Controls the minimum collateral required for Collateralized Debt Positions (CDPs)
- Values are in basis points (10000 = 100%)
- Example: 15000 = 150% collateralization required
- Higher values = more collateral needed = lower risk
- Lower values = less collateral needed = higher risk

**Code Location:**
- Contract: `contracts/xasset/src/token.rs`
- Function: `set_min_collat_ratio(new_value: u32)`
- Storage: `TokenStorage.min_collat_ratio`

## Before → After State

### Before State
```
xasset Contract:
  min_collat_ratio: 11000 (110%)
  
CDP Status:
  - Alice's CDP: 170% collateralization → Open
  - Bob's CDP: 130% collateralization → Open
```

### After State (Example: Update to 15000 = 150%)
```
Governance Action:
  governance.execute_change(
    contract: xasset_contract_address,
    new_value: 15000
  )
  
xasset Contract:
  min_collat_ratio: 15000 (150%) ← Updated
  
CDP Status:
  - Alice's CDP: 170% collateralization → Open (still above 150%)
  - Bob's CDP: 130% collateralization → Insolvent (below 150%)
```

### State Change Summary
- **Parameter**: `min_collat_ratio` increased from 11000 to 15000
- **Impact**: CDPs with collateralization ratio below 150% become insolvent
- **Risk Management**: Higher minimum ratio = more conservative lending policy

## How to Run

### Prerequisites

1. **Stellar network running** (local or testnet):
   ```bash
   # For local network
   stellar container start
   
   # For testnet, ensure you have:
   # - Network access to https://soroban-testnet.stellar.org
   # - Key identity configured: stellar keys generate mykey
   ```

2. **Contracts built**:
   ```bash
   # From project root
   cargo build --package governance --target wasm32v1-none --release
   cargo build --package xasset --target wasm32v1-none --release
   ```

3. **Key identity created**:
   ```bash
   stellar keys generate mykey
   ```

### Deployment

#### 1. Deploy xasset Contract

```bash
# Get XLM SAC contract ID
export XLM_SAC=$(stellar contract id asset --asset native --network testnet | awk -F': *' '/Contract ID/ {print $2}')

# Deploy xasset contract
stellar contract deploy \
  --network testnet \
  --source-account mykey \
  --wasm target/wasm32v1-none/release/xasset.wasm \
  -- \
  --admin mykey \
  --xlm_sac "$XLM_SAC" \
  --xlm_contract "CDPJ6T2D6ZU4S5636MKHJTPUXJUJG3FX3V7MECGUWRTPE5ULCDYFIUF2" \
  --asset_contract "CDPJ6T2D6ZU4S5636MKHJTPUXJUJG3FX3V7MECGUWRTPE5ULCDYFIUF2" \
  --pegged_asset USDT \
  --min_collat_ratio 11000 \
  --name "United States Dollar xAsset" \
  --symbol xUSD \
  --decimals 7 \
  --annual_interest_rate 100

# Save the xasset contract ID
export XASSET_CONTRACT="<contract_id_from_deployment>"
```

#### 2. Deploy Governance Contract

```bash
# Deploy governance contract
stellar contract deploy \
  --network testnet \
  --source-account mykey \
  --wasm target/wasm32v1-none/release/governance.wasm \
  -- \
  --admin mykey

# Save the governance contract ID
export GOV_CONTRACT="<contract_id_from_deployment>"
```

### Execute Governance Change

#### Option 1: Using Stellar CLI

```bash
# Update min_collat_ratio to 15000 (150%)
stellar contract invoke \
  --id $GOV_CONTRACT \
  --network testnet \
  --source-account mykey \
  -- execute_change \
  --contract $XASSET_CONTRACT \
  --new_value 15000
```

#### Option 2: Using Frontend Interface

1. **Start the frontend**:
   ```bash
   npm run dev
   ```

2. **Navigate to Governance page**:
   - Open http://localhost:5173/governance
   - Connect your wallet (must be the admin address)

3. **View current collateral ratio**:
   - Click "Refresh Ratio" button
   - See current `min_collat_ratio` value

4. **Execute governance change**:
   - Enter target contract ID (xasset contract)
   - Enter new value in basis points (15000 for 150%)
   - Click "Execute Change"
   - Sign the transaction in your wallet
   - Verify the update succeeded

### Verify the Change

```bash
# Read the updated min_collat_ratio from xasset contract
stellar contract invoke \
  --id $XASSET_CONTRACT \
  --network testnet \
  --source-account mykey \
  -- minimum_collateralization_ratio
```

Expected output:
```
15000  (or whatever value you set)
```

## Example Flow

```
1. Deploy Governance Contract
   └─> Set admin = 0xABC...
   └─> Contract ID: CDVFJ5M3T77C4BRWFXAZSPVV63SEHXGQDHW5Q6O5RSQ5FQL33JMXAH57

2. Deploy xasset Contract  
   └─> Set min_collat_ratio = 11000 (110%)
   └─> Contract ID: CDUOMJ5ODPDA7B2OTVB2MRT6QNIGSDMCQDQGEHKVKMWS62QYAUXNCY7C

3. Check Initial State
   └─> xasset.minimum_collateralization_ratio() = 11000

4. Execute Governance Change
   governance.execute_change(
     contract: xasset_contract,
     new_value: 15000
   )
   └─> Requires admin authentication
   └─> Calls xasset.set_min_collat_ratio(15000)
   
5. Verify Updated State
   └─> xasset.minimum_collateralization_ratio() = 15000
   
6. Impact on CDPs
   └─> CDPs with CR < 150% become insolvent
   └─> CDPs with CR ≥ 150% remain open
```

## Testnet Contract IDs

### Testnet Deployment
- **Governance Contract**: `CDVFJ5M3T77C4BRWFXAZSPVV63SEHXGQDHW5Q6O5RSQ5FQL33JMXAH57`
- **xasset Contract**: `CDUOMJ5ODPDA7B2OTVB2MRT6QNIGSDMCQDQGEHKVKMWS62QYAUXNCY7C`
- **Data Feed Contract**: `CDPJ6T2D6ZU4S5636MKHJTPUXJUJG3FX3V7MECGUWRTPE5ULCDYFIUF2`

## Important Notes

### Authorization

The governance contract **can only call** `set_min_collat_ratio()` if:

1. **Option 1 (Recommended)**: Modify xasset to accept governance calls
   - Add `governance_contract` address to xasset storage
   - Update `require_admin` to check both admin and governance
   
2. **Option 2**: Transfer admin to governance
   ```bash
   stellar contract invoke --id <xasset_contract> -- set_admin --new_admin <governance_contract>
   ```

### Cross-Contract Calls

The governance contract uses `contractimport!` to import the xasset client:

```rust
pub mod xasset {
    soroban_sdk::contractimport!(file = "../../target/wasm32v1-none/release/xasset.wasm");
}
```

This allows the governance contract to call xasset functions directly.

## Security Considerations

- **Admin Key**: Critical - keep secure
- **No Voting**: This is minimal governance (no voting)
- **Single Function**: Only `execute_change` is exposed
- **Admin-Only**: All changes require admin authentication

## Build

```bash
# From project root
cargo build --package governance --target wasm32v1-none --release
```

Generates: `target/wasm32v1-none/release/governance.wasm` (~870 bytes)

## Test

```bash
# From project root
cargo test --package governance
```
