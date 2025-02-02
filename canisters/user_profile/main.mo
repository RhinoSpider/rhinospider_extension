import Principal "mo:base/Principal";
import HashMap "mo:base/HashMap";
import Time "mo:base/Time";
import Result "mo:base/Result";
import Text "mo:base/Text";
import Array "mo:base/Array";
import Buffer "mo:base/Buffer";
import Int "mo:base/Int";
import Float "mo:base/Float";
import Nat "mo:base/Nat";
import ICRC1 "mo:icrc1/ICRC1";
import ICRC2 "mo:icrc2/ICRC2";
import InternetIdentity "mo:internet-identity/InternetIdentity";

actor UserProfileCanister {
    // Types
    type UserId = Principal;
    
    type UserProfile = {
        principal: Principal;
        internetIdentity: Text;
        created: Time.Time;
        lastActive: Time.Time;
        deviceIds: [Text];  // Extension IDs, Desktop IDs, etc.
        totalTrafficShared: Nat;  // in bytes
        totalRewardsEarned: Nat;  // in tokens
        reputationScore: Float;
        tier: UserTier;
    };

    type UserTier = {
        #Bronze;
        #Silver;
        #Gold;
        #Platinum;
    };

    type ContributionMetric = {
        timestamp: Time.Time;
        trafficBytes: Nat;
        contentQuality: Float;
        uniqueVisitors: Nat;
    };

    type RewardEvent = {
        timestamp: Time.Time;
        amount: Nat;
        reason: Text;
        contentId: ?Text;
    };

    // State
    private stable var profiles = HashMap.HashMap<UserId, UserProfile>(10, Principal.equal, Principal.hash);
    private stable var contributions = HashMap.HashMap<Text, ContributionMetric>(10, Text.equal, Text.hash);
    private stable var rewards = HashMap.HashMap<Text, RewardEvent>(10, Text.equal, Text.hash);
    
    // Integration with other ICP services
    private let tokenLedger = ICRC1.Actor("rwlgt-iiaaa-aaaaa-aaaaa-cai"); // Token canister
    private let internetIdentity = InternetIdentity.Actor("rdmx6-jaaaa-aaaaa-aaadq-cai");
    private let nnsGovernance = actor "rrkah-fqaaa-aaaaa-aaaaq-cai" : actor {
        get_pending_proposals : shared () -> async [ProposalInfo];
    };

    // User Management
    public shared({ caller }) func createProfile(deviceId: Text) : async Result.Result<UserProfile, Text> {
        switch (profiles.get(caller)) {
            case (?existing) {
                // Update existing profile with new device
                let updatedDevices = Array.append<Text>(existing.deviceIds, [deviceId]);
                let updated = {
                    existing with
                    deviceIds = updatedDevices;
                    lastActive = Time.now();
                };
                profiles.put(caller, updated);
                #ok(updated);
            };
            case null {
                let newProfile : UserProfile = {
                    principal = caller;
                    internetIdentity = Principal.toText(caller);
                    created = Time.now();
                    lastActive = Time.now();
                    deviceIds = [deviceId];
                    totalTrafficShared = 0;
                    totalRewardsEarned = 0;
                    reputationScore = 1.0;
                    tier = #Bronze;
                };
                profiles.put(caller, newProfile);
                #ok(newProfile);
            };
        };
    };

    // Track contributions
    public shared({ caller }) func recordContribution(contentId: Text, bytes: Nat, quality: Float, visitors: Nat) : async () {
        let metric : ContributionMetric = {
            timestamp = Time.now();
            trafficBytes = bytes;
            contentQuality = quality;
            uniqueVisitors = visitors;
        };
        contributions.put(contentId, metric);
        
        switch (profiles.get(caller)) {
            case (?profile) {
                let updated = {
                    profile with
                    totalTrafficShared = profile.totalTrafficShared + bytes;
                    lastActive = Time.now();
                };
                profiles.put(caller, updated);
                await calculateRewards(caller, contentId, metric);
            };
            case null { };
        };
    };

    // Reward calculation
    private func calculateRewards(user: Principal, contentId: Text, metric: ContributionMetric) : async () {
        let baseReward = metric.trafficBytes / 1_000_000; // 1 token per MB
        let qualityMultiplier = metric.contentQuality;
        let visitorBonus = Float.fromInt(metric.uniqueVisitors) * 0.1;
        
        let totalReward = Float.toInt(
            Float.fromInt(baseReward) * 
            qualityMultiplier * 
            (1.0 + visitorBonus)
        );

        if (totalReward > 0) {
            let event : RewardEvent = {
                timestamp = Time.now();
                amount = Int.abs(totalReward);
                reason = "Content sharing reward";
                contentId = ?contentId;
            };
            rewards.put(contentId, event);
            
            // Update user profile
            switch (profiles.get(user)) {
                case (?profile) {
                    let updated = {
                        profile with
                        totalRewardsEarned = profile.totalRewardsEarned + Int.abs(totalReward);
                    };
                    profiles.put(user, updated);
                    
                    // Transfer tokens using ICRC1 ledger
                    ignore await tokenLedger.transfer({
                        to = { owner = user; subaccount = null };
                        amount = Int.abs(totalReward);
                        fee = null;
                        memo = null;
                        created_at_time = null;
                    });
                };
                case null { };
            };
        };
    };

    // Analytics and Reporting
    public query func getUserStats(user: Principal) : async ?{
        profile: UserProfile;
        recentContributions: [ContributionMetric];
        recentRewards: [RewardEvent];
    } {
        switch (profiles.get(user)) {
            case (?profile) {
                let contributionBuffer = Buffer.Buffer<ContributionMetric>(0);
                let rewardBuffer = Buffer.Buffer<RewardEvent>(0);
                
                for ((_, contribution) in contributions.entries()) {
                    contributionBuffer.add(contribution);
                };
                
                for ((_, reward) in rewards.entries()) {
                    rewardBuffer.add(reward);
                };
                
                ?{
                    profile = profile;
                    recentContributions = Buffer.toArray(contributionBuffer);
                    recentRewards = Buffer.toArray(rewardBuffer);
                };
            };
            case null null;
        };
    };

    // Cross-platform authentication
    public shared({ caller }) func linkDevice(deviceId: Text) : async Result.Result<(), Text> {
        switch (profiles.get(caller)) {
            case (?profile) {
                if (Array.find<Text>(profile.deviceIds, func(id) { id == deviceId }) != null) {
                    #err("Device already linked");
                } else {
                    let updated = {
                        profile with
                        deviceIds = Array.append<Text>(profile.deviceIds, [deviceId]);
                    };
                    profiles.put(caller, updated);
                    #ok();
                };
            };
            case null #err("Profile not found");
        };
    };
};
