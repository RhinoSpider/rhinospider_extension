import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Text "mo:base/Text";
import Result "mo:base/Result";
import Time "mo:base/Time";
import Buffer "mo:base/Buffer";
import Array "mo:base/Array";
import Iter "mo:base/Iter";
import Nat "mo:base/Nat";
import Int "mo:base/Int";

actor Marketplace {
    // Types
    type Dataset = {
        id: Text;
        name: Text;
        description: Text;
        category: Text;
        region: Text;
        size: Nat;
        lastUpdate: Int;
        price: Nat;
        currency: Text;
        sampleData: Text;
        format: Text;
        updateFrequency: Text;
        dataPoints: Nat;
        tags: [Text];
        provider: Principal;
        isActive: Bool;
    };

    type Purchase = {
        id: Text;
        datasetId: Text;
        buyer: Principal;
        purchaseDate: Int;
        price: Nat;
        currency: Text;
        accessType: Text;
        apiKey: ?Text;
        downloadUrl: ?Text;
        expiryDate: ?Int;
        status: Text;
    };

    // State
    private stable var stableDatasets : [(Text, Dataset)] = [];
    private stable var stablePurchases : [(Text, Purchase)] = [];
    
    private var datasets = HashMap.HashMap<Text, Dataset>(0, Text.equal, Text.hash);
    private var purchases = HashMap.HashMap<Text, Purchase>(0, Text.equal, Text.hash);

    // Admin list  
    private stable var admins : [Principal] = [];
    
    // Initial admin principal
    private let INITIAL_ADMIN = "vnsgt-djy2g-igpvh-sevfi-ota4n-dtquw-nz7i6-4glkr-ijmrd-5w3uh-gae";
    
    // Initialize
    public shared(msg) func init() : async () {
        admins := Array.append(admins, [Principal.fromText(INITIAL_ADMIN)]);
        admins := Array.append(admins, [msg.caller]);
    };

    // Admin check
    private func isAdmin(principal: Principal) : Bool {
        Array.find<Principal>(admins, func(p) = p == principal) != null
    };

    // Dataset Management
    public shared(msg) func createDataset(dataset: Dataset) : async Result.Result<Text, Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admins can create datasets");
        };
        datasets.put(dataset.id, dataset);
        #ok(dataset.id)
    };

    public query func getAllDatasets() : async [Dataset] {
        Iter.toArray(datasets.vals())
    };

    public query func getDataset(id: Text) : async Result.Result<Dataset, Text> {
        switch (datasets.get(id)) {
            case (null) { #err("Dataset not found") };
            case (?dataset) { #ok(dataset) };
        }
    };

    // Purchase Management
    public shared(msg) func purchaseDataset(
        datasetId: Text,
        accessType: Text,
        paymentTxId: Text
    ) : async Result.Result<Purchase, Text> {
        let dataset = switch (datasets.get(datasetId)) {
            case (null) { return #err("Dataset not found") };
            case (?d) { d };
        };

        let purchaseId = "PUR_" # Int.toText(Time.now());
        let purchase : Purchase = {
            id = purchaseId;
            datasetId = datasetId;
            buyer = msg.caller;
            purchaseDate = Time.now();
            price = dataset.price;
            currency = dataset.currency;
            accessType = accessType;
            apiKey = if (accessType == "api") { ?"sk_live_" # Int.toText(Time.now()) } else { null };
            downloadUrl = if (accessType == "download") { ?"https://download.rhinospider.io/" # datasetId } else { null };
            expiryDate = null;
            status = "active";
        };

        purchases.put(purchaseId, purchase);
        #ok(purchase)
    };

    public shared(msg) func getUserPurchases() : async [Purchase] {
        let userPurchases = Buffer.Buffer<Purchase>(0);
        for ((id, purchase) in purchases.entries()) {
            if (purchase.buyer == msg.caller) {
                userPurchases.add(purchase);
            };
        };
        Buffer.toArray(userPurchases)
    };

    // Admin functions
    public shared(msg) func addAdmin(principal: Principal) : async Result.Result<(), Text> {
        if (not isAdmin(msg.caller)) {
            return #err("Unauthorized: Only admins can add other admins");
        };
        admins := Array.append(admins, [principal]);
        #ok()
    };

    public query func getAdmins() : async [Principal] {
        admins
    };

    // System functions
    system func preupgrade() {
        stableDatasets := Iter.toArray(datasets.entries());
        stablePurchases := Iter.toArray(purchases.entries());
    };

    system func postupgrade() {
        datasets := HashMap.fromIter<Text, Dataset>(stableDatasets.vals(), stableDatasets.size(), Text.equal, Text.hash);
        purchases := HashMap.fromIter<Text, Purchase>(stablePurchases.vals(), stablePurchases.size(), Text.equal, Text.hash);
        stableDatasets := [];
        stablePurchases := [];
    };
}
