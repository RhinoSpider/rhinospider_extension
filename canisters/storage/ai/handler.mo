import Result "mo:base/Result";
import Text "mo:base/Text";
import Error "mo:base/Error";

module {
    public func extractField(content: Text, prompt: Text) : async Result.Result<Text, Text> {
        // TODO: Implement AI extraction
        // For now, just return a mock value
        let _content = content;  // Use _ prefix to indicate intentionally unused
        #ok("Mock extracted value for prompt: " # prompt)
    };
}
