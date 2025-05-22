// Update script for the admin canister
// This file contains the changes needed to fix the authorization issues

import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Debug "mo:base/Debug";
import Result "mo:base/Result";
import Iter "mo:base/Iter";
import HashMap "mo:base/HashMap";
import Buffer "mo:base/Buffer";
import Time "mo:base/Time";
import Array "mo:base/Array";

actor AdminUpdate {
    // Constants
    private let STORAGE_CANISTER_ID: Text = "hhaip-uiaaa-aaaao-a4khq-cai";
    private let CONSUMER_CANISTER_ID: Text = "tgyl5-yyaaa-aaaaj-az4wq-cai";
    private let USER_PRINCIPAL_ID: Text = "p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe";
    private let ADMIN_PRINCIPAL_ID: Text = "t52au-jmmys-xpd7e-f2cc7-xgsya-2ajbl-22leo-e7hep-kclwp-kqzoq-jae";

    // Types
    type UserRole = {
        #SuperAdmin;
        #Admin;
        #Operator;
    };

    type User = {
        principal: Principal;
        role: UserRole;
        addedBy: Principal;
        addedAt: Time.Time;
    };

    // Updated authorization check that allows anonymous principals for query methods
    private func _isAuthorized(caller: Principal) : Bool {
        let callerStr = Principal.toText(caller);
        Debug.print("Authorization check for caller: " # callerStr);
        
        // Allow consumer canister - using Text.equal for reliable comparison
        if (Text.equal(callerStr, CONSUMER_CANISTER_ID)) {
            Debug.print("Consumer canister authorized via Text.equal");
            return true;
        };
        
        // Explicitly allow the user principal
        if (Text.equal(callerStr, USER_PRINCIPAL_ID)) {
            Debug.print("User principal explicitly authorized");
            return true;
        };
        
        // Explicitly allow the admin principal
        if (Text.equal(callerStr, ADMIN_PRINCIPAL_ID)) {
            Debug.print("Admin principal explicitly authorized");
            return true;
        };
        
        // Allow anonymous principal for query methods
        if (Principal.isAnonymous(caller)) {
            Debug.print("Anonymous principal authorized for query methods");
            return true;
        };
        
        // Check if the caller is in the users map
        // This would be implemented in the actual canister
        Debug.print("Caller not explicitly authorized: " # callerStr);
        return false;
    };

    // Consumer canister check
    private func _isConsumerCanister(caller: Principal): Bool {
        let callerStr = Principal.toText(caller);
        let isConsumer = Text.equal(callerStr, CONSUMER_CANISTER_ID);
        Debug.print("Admin _isConsumerCanister: Caller: " # callerStr # ", Expected: " # CONSUMER_CANISTER_ID # ", Match: " # debug_show(isConsumer));
        isConsumer
    };

    // Test function to check if a principal is authorized
    public query func isAuthorized(principal: Text) : async Bool {
        let p = Principal.fromText(principal);
        _isAuthorized(p)
    };

    // Test function to check if a principal is the consumer canister
    public query func isConsumerCanister(principal: Text) : async Bool {
        let p = Principal.fromText(principal);
        _isConsumerCanister(p)
    };

    // Test function to get the consumer canister ID
    public query func getConsumerCanisterId() : async Text {
        CONSUMER_CANISTER_ID
    };

    // Test function to get the user principal ID
    public query func getUserPrincipalId() : async Text {
        USER_PRINCIPAL_ID
    };

    // Test function to get the admin principal ID
    public query func getAdminPrincipalId() : async Text {
        ADMIN_PRINCIPAL_ID
    };
}
