import Array "mo:base/Array";
import Time "mo:base/Time";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Result "mo:base/Result";
import Nat "mo:base/Nat";
import Debug "mo:base/Debug";

actor BackupCanister {
    // backup snapshot type
    type BackupSnapshot = {
        timestamp: Int;
        dataSize: Nat;
        backupData: [(Principal, UserProfileBackup)];
        pointsHistoryBackup: [(Principal, [PointsRecordBackup])];
        conversionRequestsBackup: [(Text, ConversionRequestBackup)];
    };

    // simplified types for backup (matching consumer canister)
    type UserProfileBackup = {
        principal: Principal;
        devices: [Text];
        created: Int;
        lastLogin: Int;
        points: Nat;
        totalDataScraped: Nat;
        referralCode: Text;
        referralCount: Nat;
        referredBy: ?Principal;
        pointsFromScraping: Nat;
        pointsFromReferrals: Nat;
        totalPagesScraped: Nat;
        totalBandwidthUsed: Nat;
    };

    type PointsRecordBackup = {
        amount: Nat;
        earnedAt: Int;
        source: Text;
    };

    type ConversionRequestBackup = {
        id: Text;
        userId: Principal;
        pointsAmount: Nat;
        tokensGross: Nat;
        tokensFee: Nat;
        tokensNet: Nat;
        requestedAt: Int;
        status: Text;
        walletAddress: Text;
    };

    // store backups in stable memory
    private stable var stableBackups: [BackupSnapshot] = [];
    private var backups = HashMap.HashMap<Int, BackupSnapshot>(10, func(a: Int, b: Int): Bool { a == b }, func(a: Int): Nat32 { Nat32.fromIntWrap(a) });

    // authorized principals who can create/restore backups
    private stable var authorizedPrincipals: [Principal] = [];

    // check if caller is authorized
    private func isAuthorized(caller: Principal): Bool {
        // allow the consumer canister
        if (Principal.toText(caller) == "t3pjp-kqaaa-aaaao-a4ooq-cai") {
            return true;
        };

        // check authorized list
        for (id in authorizedPrincipals.vals()) {
            if (Principal.equal(caller, id)) {
                return true;
            };
        };
        false
    };

    // create a new backup snapshot
    public shared(msg) func createBackup(
        userProfiles: [(Principal, UserProfileBackup)],
        pointsHistory: [(Principal, [PointsRecordBackup])],
        conversionRequests: [(Text, ConversionRequestBackup)]
    ): async Result.Result<Int, Text> {
        if (not isAuthorized(msg.caller)) {
            return #err("Not authorized");
        };

        let timestamp = Time.now();
        let snapshot: BackupSnapshot = {
            timestamp = timestamp;
            dataSize = userProfiles.size();
            backupData = userProfiles;
            pointsHistoryBackup = pointsHistory;
            conversionRequestsBackup = conversionRequests;
        };

        backups.put(timestamp, snapshot);

        Debug.print("Backup created at " # debug_show(timestamp) # " with " # Nat.toText(userProfiles.size()) # " user profiles");

        #ok(timestamp)
    };

    // get all backup timestamps
    public query func listBackups(): async [(Int, Nat)] {
        let entries = Iter.toArray(backups.entries());
        Array.map<(Int, BackupSnapshot), (Int, Nat)>(
            entries,
            func((ts, snapshot)) = (ts, snapshot.dataSize)
        )
    };

    // get a specific backup
    public query(msg) func getBackup(timestamp: Int): async Result.Result<BackupSnapshot, Text> {
        if (not isAuthorized(msg.caller)) {
            return #err("Not authorized");
        };

        switch (backups.get(timestamp)) {
            case (?snapshot) { #ok(snapshot) };
            case null { #err("Backup not found") };
        }
    };

    // get the latest backup
    public query(msg) func getLatestBackup(): async Result.Result<BackupSnapshot, Text> {
        if (not isAuthorized(msg.caller)) {
            return #err("Not authorized");
        };

        let entries = Iter.toArray(backups.entries());
        if (entries.size() == 0) {
            return #err("No backups available");
        };

        // find the most recent
        var latest = entries[0];
        for ((ts, snapshot) in entries.vals()) {
            if (ts > latest.0) {
                latest := (ts, snapshot);
            };
        };

        #ok(latest.1)
    };

    // delete old backups (keep only last N)
    public shared(msg) func pruneOldBackups(keepCount: Nat): async Result.Result<Nat, Text> {
        if (not isAuthorized(msg.caller)) {
            return #err("Not authorized");
        };

        let entries = Iter.toArray(backups.entries());
        if (entries.size() <= keepCount) {
            return #ok(0);
        };

        // sort by timestamp descending
        let sorted = Array.sort<(Int, BackupSnapshot)>(
            entries,
            func(a, b) = if (a.0 > b.0) { #less } else if (a.0 < b.0) { #greater } else { #equal }
        );

        // delete old ones
        var deletedCount = 0;
        for (i in Iter.range(keepCount, sorted.size() - 1)) {
            backups.delete(sorted[i].0);
            deletedCount += 1;
        };

        Debug.print("Pruned " # Nat.toText(deletedCount) # " old backups, kept " # Nat.toText(keepCount));
        #ok(deletedCount)
    };

    // add authorized principal
    public shared(msg) func addAuthorized(principal: Principal): async Result.Result<(), Text> {
        // only existing authorized users can add new ones
        if (not isAuthorized(msg.caller) and authorizedPrincipals.size() > 0) {
            return #err("Not authorized");
        };

        // check if already authorized
        for (id in authorizedPrincipals.vals()) {
            if (Principal.equal(id, principal)) {
                return #err("Already authorized");
            };
        };

        authorizedPrincipals := Array.append(authorizedPrincipals, [principal]);
        Debug.print("Added authorized principal: " # Principal.toText(principal));
        #ok()
    };

    // get backup stats
    public query func getStats(): async {
        totalBackups: Nat;
        oldestBackup: ?Int;
        newestBackup: ?Int;
        totalDataSize: Nat;
    } {
        let entries = Iter.toArray(backups.entries());

        if (entries.size() == 0) {
            return {
                totalBackups = 0;
                oldestBackup = null;
                newestBackup = null;
                totalDataSize = 0;
            };
        };

        var oldest = entries[0].0;
        var newest = entries[0].0;
        var totalSize = 0;

        for ((ts, snapshot) in entries.vals()) {
            if (ts < oldest) { oldest := ts };
            if (ts > newest) { newest := ts };
            totalSize += snapshot.dataSize;
        };

        {
            totalBackups = entries.size();
            oldestBackup = ?oldest;
            newestBackup = ?newest;
            totalDataSize = totalSize;
        }
    };

    // upgrade hooks
    system func preupgrade() {
        stableBackups := Iter.toArray(backups.entries()).map(func((ts, snapshot)) = snapshot);
    };

    system func postupgrade() {
        for (snapshot in stableBackups.vals()) {
            backups.put(snapshot.timestamp, snapshot);
        };
    };
}
