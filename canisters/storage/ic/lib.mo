import Principal "mo:base/Principal";
import Blob "mo:base/Blob";
import Error "mo:base/Error";
import Time "mo:base/Time";
import Result "mo:base/Result";

module {
    public type CanisterId = Principal;
    public type UserId = Principal;
    public type Time = Time.Time;

    public type ManagementCanister = actor {
        create_canister : shared () -> async { canister_id : Principal };
        install_code : shared {
            arg : Blob;
            wasm_module : Blob;
            mode : { #install; #reinstall; #upgrade };
            canister_id : Principal;
        } -> async ();
        update_settings : shared {
            canister_id : Principal;
            settings : { controllers : ?[Principal] };
        } -> async ();
        canister_status : shared { canister_id : Principal } -> async {
            status : { #running; #stopping; #stopped };
            memory_size : Nat;
            cycles : Nat;
            settings : { controllers : [Principal] };
            module_hash : ?Blob;
        };
        stop_canister : shared { canister_id : Principal } -> async ();
        start_canister : shared { canister_id : Principal } -> async ();
        delete_canister : shared { canister_id : Principal } -> async ();
    };

    public func getManagementCanister() : ManagementCanister {
        actor "aaaaa-aa" : ManagementCanister;
    };

    public type Self = actor {
        accept_cycles : shared () -> async ();
        canister_status : shared () -> async {
            cycles : Nat;
            memory_size : Nat;
            module_hash : ?Blob;
            status : { #running; #stopping; #stopped };
        };
    };

    public type Identity = {
        #Anonymous;
        #Authenticated : Principal;
    };

    public func getIdentity(caller : Principal) : Identity {
        if (Principal.isAnonymous(caller)) {
            #Anonymous;
        } else {
            #Authenticated(caller);
        };
    };

    public func isAnonymous(caller : Principal) : Bool {
        Principal.isAnonymous(caller);
    };

    public func checkAuthorized(caller : Principal) : Result.Result<(), Text> {
        if (Principal.isAnonymous(caller)) {
            #err("Unauthorized");
        } else {
            #ok();
        };
    };

    public type HeaderField = (Text, Text);

    public type HttpResponse = {
        status : Nat;
        headers : [HeaderField];
        body : [Nat8];
    };

    public type HttpRequest = {
        url : Text;
        max_response_bytes : ?Nat64;
        headers : [HeaderField];
        body : ?[Nat8];
        method : { #get; #post; #head };
        transform : ?{ function : shared { context : Text; response : HttpResponse; } -> async HttpResponse };
    };

    let ic : actor {
        http_request : HttpRequest -> async HttpResponse;
    } = actor("aaaaa-aa");

    public func httpRequest(request: HttpRequest) : async HttpResponse {
        await ic.http_request(request)
    };
}
