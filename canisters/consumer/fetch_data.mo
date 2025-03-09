// Add this function to the consumer/main.mo file
// Place it after the submitScrapedData function

public shared({ caller }) func getScrapedData(topicIds: [Text]): async Result.Result<[SharedTypes.ScrapedData], SharedTypes.Error> {
    if (not isAuthenticated(caller)) {
        return #err(#NotAuthorized);
    };

    // Verify the user has a profile
    switch (userProfiles.get(caller)) {
        case null return #err(#NotAuthorized);
        case (?_) {};
    };

    Debug.print("Consumer: Fetching scraped data for topics: " # debug_show(topicIds));
    
    ExperimentalCycles.add(CYCLES_PER_CALL);
    await storage.getScrapedData(topicIds)
};
