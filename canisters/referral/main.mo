import Principal "mo:base/Principal";
import Nat "mo:base/Nat";
import Result "mo:base/Result";
import Text "mo:base/Text";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Int "mo:base/Int";

actor Referral {

    type UserData = {
        referralCode: Text;
        referralCount: Nat;
        points: Nat;
        referredBy: ?Principal;
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

    private func generateCode(): Text {
        return "REFERRALCODE";
    };

    public shared({ caller }) func getReferralCode(): async Result.Result<Text, Text> {
        switch (users.get(caller)) {
            case (null) {
                var newCode = generateCode();
                while (referralCodes.get(newCode) != null) {
                    newCode := generateCode();
                };
                let userData: UserData = {
                    referralCode = newCode;
                    referralCount = 0;
                    points = 0;
                    referredBy = null;
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

    

    public shared({ caller }) func getUserData(): async Result.Result<UserData, Text> {
        switch (users.get(caller)) {
            case (null) {
                return #err("User not found");
            };
            case (?userData) {
                return #ok(userData);
            };
        }
    };
};