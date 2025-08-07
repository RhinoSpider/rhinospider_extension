import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Int "mo:base/Int";
import Result "mo:base/Result";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Random "mo:base/Random";
import Char "mo:base/Char";

actor Referral {

    type UserData = {
        referralCode: Text;
        referralCount: Nat;
        points: Nat;
        totalDataScraped: Nat;
        referredBy: ?Principal;
        ipAddress: ?Text;
        lastLogin: ?Time.Time;
    };

    type ReferralTier = {
        limit: Nat;
        points: Nat;
    };

    private stable var stableUsers : [(Principal, UserData)] = [];
    private stable var stableReferralCodes : [(Text, Principal)] = [];

    private var users = HashMap.HashMap<Principal, UserData>(0, Principal.equal, Principal.hash);
    private var referralCodes = HashMap.HashMap<Text, Principal>(0, Text.equal, Text.hash);

    system func preupgrade() {
        stableUsers := Iter.toArray(users.entries());
        stableReferralCodes := Iter.toArray(referralCodes.entries());
    };

    system func postupgrade() {
        users := HashMap.fromIter<Principal, UserData>(stableUsers.vals(), 0, Principal.equal, Principal.hash);
        referralCodes := HashMap.fromIter<Text, Principal>(stableReferralCodes.vals(), 0, Text.equal, Text.hash);
    };

    private let tiers: [ReferralTier] = [
        { limit = 10; points = 100 },
        { limit = 30; points = 50 }, // 10 + 20
        { limit = 70; points = 25 }, // 30 + 40
        { limit = 1000; points = 5 },
    ];

    // Generate a unique referral code based on timestamp and random data.
    private func generateCode(): async Text {
        let randomBytes = await Random.blob();
        let timestamp_int = Time.now(); // Time.now() returns Int (nanoseconds)
        let timestamp_nat = Int.abs(timestamp_int);
        let timestamp_text = Nat.toText(timestamp_nat);
        
        // Convert random bytes to hex string for uniqueness
        var hex_part = "";
        var byte_count = 0;
        for (byte in randomBytes.vals()) {
            if (byte_count < 4) { // Use only first 4 bytes
                let nat_byte = Nat8.toNat(byte);
                let hex_digit1 = nat_byte / 16;
                let hex_digit2 = nat_byte % 16;
                hex_part #= Text.fromChar(Char.fromNat32(Nat32.fromNat(if (hex_digit1 < 10) { 48 + hex_digit1 } else { 87 + hex_digit1 })));
                hex_part #= Text.fromChar(Char.fromNat32(Nat32.fromNat(if (hex_digit2 < 10) { 48 + hex_digit2 } else { 87 + hex_digit2 })));
                byte_count += 1;
            };
        };
        
        // Take last 4 chars from timestamp
        let ts_len = Text.size(timestamp_text);
        var timestamp_part = "";
        if (ts_len >= 4) {
            var j = 0;
            for (char in timestamp_text.chars()) {
                if (j >= ts_len - 4) {
                    timestamp_part #= Text.fromChar(char);
                };
                j += 1;
            };
        } else {
            timestamp_part := timestamp_text;
        };

        return hex_part # timestamp_part;
    };

    // Return the caller's referral code, generating one if it doesn't exist.
    public shared(msg) func getReferralCode(): async Result.Result<Text, Text> {
        let caller = msg.caller;
        switch (users.get(caller)) {
            case (null) {
                var newCode = await generateCode();
                while (referralCodes.get(newCode) != null) {
                    newCode := await generateCode();
                };
                let userData: UserData = {
                    referralCode = newCode;
                    referralCount = 0;
                    points = 0;
                    totalDataScraped = 0;
                    referredBy = null;
                    ipAddress = null;
                    lastLogin = ?Time.now();
                };
                users.put(caller, userData);
                referralCodes.put(newCode, caller);
                return #ok(newCode);
            };
            case (?userData) {
                return #ok(userData.referralCode);
            };
        }
    };

    // Allow a new user to use a referral code, credit the referrer with points based on tiers,
    // and prevent self-referral or re-referral.
    public shared(msg) func useReferralCode(code: Text): async Result.Result<Text, Text> {
        let caller = msg.caller;
        switch (users.get(caller)) {
            case (null) {
                switch (referralCodes.get(code)) {
                    case (null) {
                        return #err("Invalid referral code");
                    };
                    case (?referrer) {
                        if (referrer == caller) {
                            return #err("You cannot refer yourself");
                        };
                        let userData: UserData = {
                            referralCode = ""; // User will generate their own code later
                            referralCount = 0;
                            points = 0;
                            totalDataScraped = 0;
                            referredBy = ?referrer;
                            ipAddress = null;
                            lastLogin = ?Time.now();
                        };
                        users.put(caller, userData);

                        // Update referrer's data
                        switch (users.get(referrer)) {
                            case (null) {
                                return #err("Referrer not found after lookup");
                            };
                            case (?referrerData) {
                                let newReferralCount = referrerData.referralCount + 1;
                                var pointsToAdd: Nat = 0;
                                var i = 0;
                                while (i < tiers.size()) {
                                    if (newReferralCount <= tiers[i].limit) {
                                        pointsToAdd := tiers[i].points;
                                        i := tiers.size();
                                    } else {
                                        i := i + 1;
                                    };
                                };

                                users.put(referrer, {
                                    referralCode = referrerData.referralCode;
                                    referralCount = newReferralCount;
                                    points = referrerData.points + pointsToAdd;
                                    totalDataScraped = referrerData.totalDataScraped;
                                    referredBy = referrerData.referredBy;
                                    ipAddress = referrerData.ipAddress;
                                    lastLogin = referrerData.lastLogin;
                                });

                                return #ok("Referral successful");
                            };
                        };
                    };
                };
            };
            case (?_userData) {
                return #err("You have already been referred");
            };
        }
    };

    // Return the caller's referral data including code, count, points, and total data scraped.
    public shared(msg) func getUserData(): async Result.Result<UserData, Text> {
        let caller = msg.caller;
        switch (users.get(caller)) {
            case (null) {
                return #err("User not found");
            };
            case (?userData) {
                return #ok(userData);
            };
        }
    };

    // Award points to a principal based on content length, updating their total points and total data scraped.
    public shared(msg) func awardPoints(principal: Principal, contentLength: Nat): async Result.Result<(), Text> {
        let _caller = msg.caller;
        switch (users.get(principal)) {
            case (null) {
                return #err("User not found");
            };
            case (?userData) {
                var pointsToAdd: Nat = 0;
                if (contentLength >= 0 and contentLength <= 10000) { // 0-10KB
                    pointsToAdd := 1;
                } else if (contentLength > 10000 and contentLength <= 50000) { // 10KB-50KB
                    pointsToAdd := 5;
                } else if (contentLength > 50000 and contentLength <= 200000) { // 50KB-200KB
                    pointsToAdd := 10;
                } else if (contentLength > 200000) { // 200KB+
                    pointsToAdd := 20;
                };

                users.put(principal, {
                    referralCode = userData.referralCode;
                    referralCount = userData.referralCount;
                    points = userData.points + pointsToAdd;
                    totalDataScraped = userData.totalDataScraped + contentLength;
                    referredBy = userData.referredBy;
                    ipAddress = userData.ipAddress;
                    lastLogin = userData.lastLogin;
                });
                return #ok();
            };
        }
    };

    // Update user's IP address and last login time
    public shared(msg) func updateUserLogin(ipAddress: Text) : async Result.Result<(), Text> {
        let caller = msg.caller;
        switch (users.get(caller)) {
            case (null) {
                return #err("User not found");
            };
            case (?userData) {
                users.put(caller, {
                    referralCode = userData.referralCode;
                    referralCount = userData.referralCount;
                    points = userData.points;
                    totalDataScraped = userData.totalDataScraped;
                    referredBy = userData.referredBy;
                    ipAddress = ?ipAddress;
                    lastLogin = ?Time.now();
                });
                return #ok();
            };
        }
    };
};