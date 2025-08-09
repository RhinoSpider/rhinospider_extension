const { Actor, HttpAgent } = require('@dfinity/agent');
const { Principal } = require('@dfinity/principal');

// Management canister interface for cycle transfer
const managementIdlFactory = ({ IDL }) => {
  return IDL.Service({
    deposit_cycles: IDL.Func([IDL.Record({ canister_id: IDL.Principal })], [], []),
  });
};

async function transferCycles() {
  try {
    console.log('🔄 Attempting to transfer cycles from old canisters...');
    
    const agent = new HttpAgent({ host: 'https://ic0.app' });
    
    // Use management canister
    const managementCanister = Actor.createActor(managementIdlFactory, {
      agent,
      canisterId: Principal.fromText('aaaaa-aa'), // Management canister
    });

    // Try to deposit cycles to new admin backend
    console.log('Transferring cycles to new admin backend...');
    await managementCanister.deposit_cycles({
      canister_id: Principal.fromText('wvset-niaaa-aaaao-a4osa-cai')
    });

    console.log('✅ Cycle transfer initiated!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

transferCycles();