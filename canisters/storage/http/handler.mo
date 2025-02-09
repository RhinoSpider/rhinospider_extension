import Result "mo:base/Result";
import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Nat64 "mo:base/Nat64";
import Error "mo:base/Error";
import Nat16 "mo:base/Nat16";
import Lib "./lib";

module {
    type HttpResponse = Lib.HttpResponse;
    type HeaderField = Lib.HeaderField;

    public func get(url : Text, headers : ?[HeaderField]) : async Result.Result<Text, Text> {
        let ic : actor {
            http_request : {
                url : Text;
                max_response_bytes : ?Nat64;
                headers : [HeaderField];
                body : ?[Nat8];
                method : { #get; #post; #head };
                transform : ?{ function : shared { context : Text; response : HttpResponse; } -> async HttpResponse };
            } -> async HttpResponse;
        } = actor("aaaaa-aa");

        try {
            let response = await ic.http_request({
                url = url;
                max_response_bytes = null;
                headers = switch (headers) {
                    case (null) { [] };
                    case (?h) { h };
                };
                method = #get;
                body = null;
                transform = null;
            });

            if (response.status_code >= 200 and response.status_code < 300) {
                switch (Text.decodeUtf8(response.body)) {
                    case (null) { #err("Failed to decode response body") };
                    case (?text) { #ok(text) };
                };
            } else {
                #err("HTTP request failed with status code: " # Nat16.toText(response.status_code));
            };
        } catch (e) {
            #err("Failed to make HTTP request: " # Error.message(e));
        };
    };
}
