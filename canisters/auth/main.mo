import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";

actor Auth {
    // Types
    type Client = {
        id: Text;
        principal: Principal;
        registeredAt: Int;
        lastActive: Int;
        isActive: Bool;
        bandwidthLimit: Nat; // bytes per day
    };

    type ClientStats = {
        bytesUploaded: Nat;
        bytesDownloaded: Nat;
        lastUpdate: Int;
    };

    // State
    private var clients = HashMap.HashMap<Principal, Client>(0, Principal.equal, Principal.hash);
    private var clientStats = HashMap.HashMap<Principal, ClientStats>(0, Principal.equal, Principal.hash);
    private var admins = HashMap.HashMap<Principal, Bool>(0, Principal.equal, Principal.hash);

    // Initialize with default admin
    private stable let INITIAL_ADMIN = "p6gaf-qjt3x-6q6ci-ro7nd-aklhp-6hgfo-4dljo-busl6-3ftgp-iliyi-zqe";

    // Constructor
    public shared func init(): async () {
        admins.put(Principal.fromText(INITIAL_ADMIN), true);
    };

    // Register a new client
    public shared({ caller }) func registerClient(bandwidthLimit: Nat): async Result.Result<Client, Text> {
        let client: Client = {
            id = Principal.toText(caller);
            principal = caller;
            registeredAt = Time.now();
            lastActive = Time.now();
            isActive = true;
            bandwidthLimit = bandwidthLimit;
        };

        clients.put(caller, client);
        
        let stats: ClientStats = {
            bytesUploaded = 0;
            bytesDownloaded = 0;
            lastUpdate = Time.now();
        };
        
        clientStats.put(caller, stats);
        
        #ok(client)
    };

    // Update client stats
    public shared({ caller }) func updateStats(uploaded: Nat, downloaded: Nat): async Result.Result<(), Text> {
        switch (clientStats.get(caller)) {
            case (null) { #err("Client not found") };
            case (?stats) {
                let newStats: ClientStats = {
                    bytesUploaded = stats.bytesUploaded + uploaded;
                    bytesDownloaded = stats.bytesDownloaded + downloaded;
                    lastUpdate = Time.now();
                };
                clientStats.put(caller, newStats);
                #ok(())
            };
        }
    };

    // Check if client is authorized
    public query func isAuthorized(client: Principal): async Bool {
        switch (clients.get(client)) {
            case (null) { false };
            case (?c) { c.isActive };
        }
    };

    // Admin: Deactivate client
    public shared({ caller }) func deactivateClient(clientId: Principal): async Result.Result<(), Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized");
        };

        switch (clients.get(clientId)) {
            case (null) { #err("Client not found") };
            case (?client) {
                let updatedClient: Client = {
                    id = client.id;
                    principal = client.principal;
                    registeredAt = client.registeredAt;
                    lastActive = Time.now();
                    isActive = false;
                    bandwidthLimit = client.bandwidthLimit;
                };
                clients.put(clientId, updatedClient);
                #ok(())
            };
        }
    };

    // Admin: Update bandwidth limit
    public shared({ caller }) func updateBandwidthLimit(clientId: Principal, newLimit: Nat): async Result.Result<(), Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized");
        };

        switch (clients.get(clientId)) {
            case (null) { #err("Client not found") };
            case (?client) {
                let updatedClient: Client = {
                    id = client.id;
                    principal = client.principal;
                    registeredAt = client.registeredAt;
                    lastActive = client.lastActive;
                    isActive = client.isActive;
                    bandwidthLimit = newLimit;
                };
                clients.put(clientId, updatedClient);
                #ok(())
            };
        }
    };

    // Get client stats
    public query({ caller }) func getClientStats(): async Result.Result<ClientStats, Text> {
        switch (clientStats.get(caller)) {
            case (null) { #err("Client not found") };
            case (?stats) { #ok(stats) };
        }
    };

    // Admin: Get all clients
    public shared query({ caller }) func getAllClients(): async Result.Result<[Client], Text> {
        if (not isAdmin(caller)) {
            return #err("Unauthorized");
        };

        let buffer = Buffer.Buffer<Client>(0);
        for ((_, client) in clients.entries()) {
            buffer.add(client);
        };
        #ok(Buffer.toArray(buffer))
    };

    // Helper: Check if caller is admin
    private func isAdmin(caller: Principal): Bool {
        switch (admins.get(caller)) {
            case (null) { false };
            case (?isAdmin) { isAdmin };
        }
    };
}
