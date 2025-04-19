import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import SharedTypes "../shared/types";
import Result "mo:base/Result";

actor class ClearDataExtension(storageCanisterId: Text) = this {
    // Define the admin principal - this is your principal ID
    let adminPrincipal : Principal = Principal.fromText("nqkf7-4psg2-xnfiu-ht7if-oghvx-m2gb5-e3ifk-pjtfq-o5wiu-scumu-dqe");
    
    // Storage canister actor interface
    type StorageCanister = actor {
        clearAllData : shared () -> async Result.Result<(), SharedTypes.Error>;
    };
    
    // Get the storage canister actor
    let storageCanister : StorageCanister = actor(storageCanisterId);
    
    // Clear all data - can only be called by admin
    public shared(msg) func clearAllData() : async Result.Result<(), Text> {
        // Check if caller is admin
        if (not Principal.equal(msg.caller, adminPrincipal)) {
            Debug.print("Unauthorized attempt to clear data by: " # Principal.toText(msg.caller));
            return #err("Unauthorized: only the admin can clear data");
        };
        
        Debug.print("Admin authorized to clear data: " # Principal.toText(msg.caller));
        
        try {
            // Call the clearAllData method on the storage canister
            let result = await storageCanister.clearAllData();
            
            switch (result) {
                case (#ok()) {
                    Debug.print("Successfully cleared all data from storage canister");
                    #ok()
                };
                case (#err(error)) {
                    Debug.print("Error clearing data: " # debug_show(error));
                    #err("Error clearing data: " # debug_show(error))
                };
            }
        } catch (e) {
            Debug.print("Exception clearing data: " # debug_show(e));
            #err("Exception: " # debug_show(e))
        }
    };
}
