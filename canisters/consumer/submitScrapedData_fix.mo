    // Scraped data management with points - FIXED VERSION
    public shared({ caller }) func submitScrapedData(data: SharedTypes.ScrapedData): async Result.Result<(), SharedTypes.Error> {
        if (not isAuthenticated(caller)) {
            return #err(#NotAuthorized);
        };

        // Use client_id from the data instead of caller for user attribution
        let userPrincipal = data.client_id;
        
        // Get or create user profile
        let profile = switch (userProfiles.get(userPrincipal)) {
            case (?existingProfile) existingProfile;
            case null {
                // Auto-create profile if it doesn't exist
                Debug.print("Creating profile for new user: " # Principal.toText(userPrincipal));
                let newProfile : UserProfile = {
                    userId = userPrincipal;
                    referralCode = generateReferralCode(userPrincipal);
                    totalDataScraped = 0;
                    points = 0;
                    referrals = [];
                    referredBy = null;
                    createdAt = Time.now();
                    lastActive = Time.now();
                    scrapedUrls = [];
                    dailyStats = [];
                    ipAddress = null;
                    geoLocation = null;
                    dataVolumeKB = 0;
                    lastLogin = Time.now();
                    isActive = true;
                };
                userProfiles.put(userPrincipal, newProfile);
                newProfile
            };
        };

        // Check if URL was already scraped by this user
        let urlAlreadyScraped = switch (Array.find<Text>(profile.scrapedUrls, func(u) = u == data.url)) {
            case (?_) true;
            case null false;
        };
        
        // Calculate points for this submission
        let contentLength = Text.size(data.content);
        let points = if (urlAlreadyScraped) 0 else calculatePoints(contentLength); // No points for duplicate URLs
        let dataKB = contentLength / 1024;
        
        // Add URL to scraped list if new
        let updatedScrapedUrls = if (urlAlreadyScraped) {
            profile.scrapedUrls
        } else {
            Array.append(profile.scrapedUrls, [data.url])
        };
        
        // Update profile with new points and data scraped
        let updatedProfile = {
            profile with
            points = profile.points + points;
            totalDataScraped = profile.totalDataScraped + contentLength;
            dataVolumeKB = profile.dataVolumeKB + dataKB;
            scrapedUrls = updatedScrapedUrls;
            lastLogin = Time.now();
            lastActive = Time.now();
            isActive = true;
        };
        userProfiles.put(userPrincipal, updatedProfile);
        
        // Award referral bonus to referrer if applicable
        switch (profile.referredBy) {
            case (?referrer) {
                switch (userProfiles.get(referrer)) {
                    case (?referrerProfile) {
                        let referralBonus = points / 10; // 10% of points go to referrer
                        let updatedReferrerProfile = {
                            referrerProfile with
                            points = referrerProfile.points + referralBonus;
                        };
                        userProfiles.put(referrer, updatedReferrerProfile);
                    };
                    case null {};
                };
            };
            case null {};
        };

        // Update topic stats in admin canister
        // TODO: Re-enable when admin canister interface is updated
        // try {
        //     Debug.print("Consumer: Updating topic stats for topic: " # data.topicId);
        //     Prim.cyclesAdd(CYCLES_PER_CALL);
        //     let statsResult = await admin.updateTopicStats(data.topicId);
        //     switch(statsResult) {
        //         case (#ok()) {
        //             Debug.print("Consumer: Successfully updated topic stats");
        //         };
        //         case (#err(msg)) {
        //             Debug.print("Consumer: Failed to update topic stats: " # msg);
        //             // Don't fail the submission if stats update fails
        //         };
        //     };
        // } catch (error) {
        //     Debug.print("Consumer: Error updating topic stats: " # Error.message(error));
        //     // Don't fail the submission if stats update fails
        // };

        Prim.cyclesAdd(CYCLES_PER_CALL);
        await storage.storeScrapedData(data)
    };