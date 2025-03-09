// Update to the storage canister to fix authorization issues
// This file contains only the modified authorization function

import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Array "mo:base/Array";

actor class StorageUpdate() {
    // Modified authorization function to ensure the consumer canister is properly authorized
    private func isAuthorizedCaller(caller: Principal): Bool {
        // Debug logging for authorization
        Debug.print("isAuthorizedCaller called for: " # Principal.toText(caller));
        
        // Allow self-calls
        if (Principal.equal(caller, Principal.fromActor(this))) {
            Debug.print("Self-call authorized");
            return true;
        };

        // Allow the anonymous identity (2vxsx-fae) used by the proxy server
        if (Principal.toText(caller) == "2vxsx-fae") {
            Debug.print("Anonymous identity authorized");
            return true;
        };

        // Explicitly allow the consumer canister - FIXED: Ensure this check works properly
        let consumerCanisterId = "tgyl5-yyaaa-aaaaj-az4wq-cai";
        if (Principal.toText(caller) == consumerCanisterId) {
            Debug.print("Consumer canister explicitly authorized: " # consumerCanisterId);
            return true;
        };
        
        // Allow the proxy server to submit data on behalf of extension users
        let proxyPrincipals = [
            "2vxsx-fae", // Anonymous principal
            // Add any other proxy server principals here
        ];
        
        for (proxyPrincipal in proxyPrincipals.vals()) {
            if (Principal.toText(caller) == proxyPrincipal) {
                Debug.print("PROXY SERVER: Authorizing for data submission: " # Principal.toText(caller));
                return true;
            };
        };
        
        // Check if caller is in the authorized canisters list
        for (id in authorizedCanisterIds.vals()) {
            if (Principal.equal(caller, id)) {
                Debug.print("Authorized canister from list: " # Principal.toText(id));
                return true;
            };
        };
        
        Debug.print("Authorization failed for: " # Principal.toText(caller));
        false
    };

    // Placeholder for the authorizedCanisterIds variable
    private stable var authorizedCanisterIds: [Principal] = [];

    // Function to add an authorized canister
    public shared({ caller }) func addAuthorizedCanister(canisterId: Principal): async Result.Result<(), Error> {
        // Only allow this canister itself to add authorized canisters
        if (not Principal.equal(caller, Principal.fromActor(this))) {
            return #err(#NotAuthorized);
        };

        // Check if the canister is already authorized
        for (id in authorizedCanisterIds.vals()) {
            if (Principal.equal(canisterId, id)) {
                return #err(#AlreadyExists);
            };
        };

        // Add the canister to the authorized list
        authorizedCanisterIds := Array.append(authorizedCanisterIds, [canisterId]);
        #ok()
    };
}
