import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Nat16 "mo:base/Nat16";

module {
    public type HeaderField = (Text, Text);

    public type HttpRequest = {
        url : Text;
        method : Text;
        body : Blob;
        headers : [HeaderField];
    };

    public type HttpResponse = {
        body : Blob;
        headers : [HeaderField];
        status_code : Nat16;
        streaming_strategy : ?StreamingStrategy;
    };

    public type StreamingStrategy = {
        #Callback : {
            callback : shared () -> async ();
            token : StreamingCallbackToken;
        };
    };

    public type StreamingCallbackToken = {
        content_encoding : Text;
        index : Nat;
        key : Text;
    };

    public type StreamingCallbackResponse = {
        body : Blob;
        token : ?StreamingCallbackToken;
    };

    // Common HTTP status codes
    public let STATUS_OK : Nat16 = 200;
    public let STATUS_CREATED : Nat16 = 201;
    public let STATUS_ACCEPTED : Nat16 = 202;
    public let STATUS_NO_CONTENT : Nat16 = 204;
    public let STATUS_BAD_REQUEST : Nat16 = 400;
    public let STATUS_UNAUTHORIZED : Nat16 = 401;
    public let STATUS_FORBIDDEN : Nat16 = 403;
    public let STATUS_NOT_FOUND : Nat16 = 404;
    public let STATUS_INTERNAL_SERVER_ERROR : Nat16 = 500;

    // Common HTTP headers
    public func contentType(mediaType : Text) : HeaderField {
        ("Content-Type", mediaType);
    };

    public func jsonContentType() : HeaderField {
        contentType("application/json");
    };

    public func htmlContentType() : HeaderField {
        contentType("text/html");
    };

    public func textContentType() : HeaderField {
        contentType("text/plain");
    };

    // Helper functions
    public func makeResponse(
        body : Blob,
        status : Nat16,
        headers : [HeaderField],
    ) : HttpResponse {
        {
            body;
            headers;
            status_code = status;
            streaming_strategy = null;
        };
    };

    public func makeJsonResponse(
        body : Blob,
        status : Nat16,
    ) : HttpResponse {
        makeResponse(body, status, [jsonContentType()]);
    };

    public func makeErrorResponse(
        message : Text,
        status : Nat16,
    ) : HttpResponse {
        let body = Text.encodeUtf8(message);
        makeResponse(body, status, [textContentType()]);
    };
}
