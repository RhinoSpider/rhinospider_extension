"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebAuthnIdentity = exports.CosePublicKey = void 0;
const agent_1 = require("@dfinity/agent");
const borc_1 = __importDefault(require("borc"));
const utils_1 = require("@noble/hashes/utils");
function _coseToDerEncodedBlob(cose) {
    return (0, agent_1.wrapDER)(cose, agent_1.DER_COSE_OID).buffer;
}
/**
 * From the documentation;
 * The authData is a byte array described in the spec. Parsing it will involve slicing bytes from
 * the array and converting them into usable objects.
 *
 * See https://webauthn.guide/#registration (subsection "Example: Parsing the authenticator data").
 * @param authData The authData field of the attestation response.
 * @returns The COSE key of the authData.
 */
function _authDataToCose(authData) {
    const dataView = new DataView(new ArrayBuffer(2));
    const idLenBytes = authData.slice(53, 55);
    [...new Uint8Array(idLenBytes)].forEach((v, i) => dataView.setUint8(i, v));
    const credentialIdLength = dataView.getUint16(0);
    // Get the public key object.
    return authData.slice(55 + credentialIdLength);
}
class CosePublicKey {
    constructor(_cose) {
        this._cose = _cose;
        this._encodedKey = _coseToDerEncodedBlob(_cose);
    }
    toDer() {
        return this._encodedKey;
    }
    getCose() {
        return this._cose;
    }
}
exports.CosePublicKey = CosePublicKey;
/**
 * Create a challenge from a string or array. The default challenge is always the same
 * because we don't need to verify the authenticity of the key on the server (we don't
 * register our keys with the IC). Any challenge would do, even one per key, randomly
 * generated.
 * @param challenge The challenge to transform into a byte array. By default a hard
 *        coded string.
 */
function _createChallengeBuffer(challenge = '<ic0.app>') {
    if (typeof challenge === 'string') {
        return Uint8Array.from(challenge, c => c.charCodeAt(0));
    }
    else {
        return challenge;
    }
}
/**
 * Create a credentials to authenticate with a server. This is necessary in order in
 * WebAuthn to get credentials IDs (which give us the public key and allow us to
 * sign), but in the case of the Internet Computer, we don't actually need to register
 * it, so we don't.
 * @param credentialCreationOptions an optional CredentialCreationOptions object
 */
async function _createCredential(credentialCreationOptions) {
    const creds = (await navigator.credentials.create(credentialCreationOptions !== null && credentialCreationOptions !== void 0 ? credentialCreationOptions : {
        publicKey: {
            authenticatorSelection: {
                userVerification: 'preferred',
            },
            attestation: 'direct',
            challenge: _createChallengeBuffer(),
            pubKeyCredParams: [{ type: 'public-key', alg: PubKeyCoseAlgo.ECDSA_WITH_SHA256 }],
            rp: {
                name: 'Internet Identity Service',
            },
            user: {
                id: (0, utils_1.randomBytes)(16),
                name: 'Internet Identity',
                displayName: 'Internet Identity',
            },
        },
    }));
    // Validate that it's the correct type at runtime, since WebAuthn does not HAVE to
    // reply with a PublicKeyCredential.
    if (creds.response === undefined || !(creds.rawId instanceof ArrayBuffer)) {
        return null;
    }
    else {
        return creds;
    }
}
// See https://www.iana.org/assignments/cose/cose.xhtml#algorithms for a complete
// list of these algorithms. We only list the ones we support here.
var PubKeyCoseAlgo;
(function (PubKeyCoseAlgo) {
    PubKeyCoseAlgo[PubKeyCoseAlgo["ECDSA_WITH_SHA256"] = -7] = "ECDSA_WITH_SHA256";
})(PubKeyCoseAlgo || (PubKeyCoseAlgo = {}));
/**
 * A SignIdentity that uses `navigator.credentials`. See https://webauthn.guide/ for
 * more information about WebAuthentication.
 */
class WebAuthnIdentity extends agent_1.SignIdentity {
    constructor(rawId, cose, authenticatorAttachment) {
        super();
        this.rawId = rawId;
        this.authenticatorAttachment = authenticatorAttachment;
        this._publicKey = new CosePublicKey(cose);
    }
    /**
     * Create an identity from a JSON serialization.
     * @param json - json to parse
     */
    static fromJSON(json) {
        const { publicKey, rawId } = JSON.parse(json);
        if (typeof publicKey !== 'string' || typeof rawId !== 'string') {
            throw new Error('Invalid JSON string.');
        }
        return new this((0, agent_1.fromHex)(rawId), (0, agent_1.fromHex)(publicKey), undefined);
    }
    /**
     * Create an identity.
     * @param credentialCreationOptions an optional CredentialCreationOptions Challenge
     */
    static async create(credentialCreationOptions) {
        var _a;
        const creds = await _createCredential(credentialCreationOptions);
        if (!creds || creds.type !== 'public-key') {
            throw new Error('Could not create credentials.');
        }
        const response = creds.response;
        if (!(response.attestationObject instanceof ArrayBuffer)) {
            throw new Error('Was expecting an attestation response.');
        }
        // Parse the attestationObject as CBOR.
        const attObject = borc_1.default.decodeFirst(new Uint8Array(response.attestationObject));
        return new this(creds.rawId, _authDataToCose(attObject.authData), (_a = creds.authenticatorAttachment) !== null && _a !== void 0 ? _a : undefined);
    }
    getPublicKey() {
        return this._publicKey;
    }
    /**
     * WebAuthn level 3 spec introduces a new attribute on successful WebAuthn interactions,
     * see https://w3c.github.io/webauthn/#dom-publickeycredential-authenticatorattachment.
     * This attribute is already implemented for Chrome, Safari and Edge.
     *
     * Given the attribute is only available after a successful interaction, the information is
     * provided opportunistically and might also be `undefined`.
     */
    getAuthenticatorAttachment() {
        return this.authenticatorAttachment;
    }
    async sign(blob) {
        const result = (await navigator.credentials.get({
            publicKey: {
                allowCredentials: [
                    {
                        type: 'public-key',
                        id: this.rawId,
                    },
                ],
                challenge: blob,
                userVerification: 'preferred',
            },
        }));
        if (result.authenticatorAttachment !== null) {
            this.authenticatorAttachment = result.authenticatorAttachment;
        }
        const response = result.response;
        if (response.signature instanceof ArrayBuffer &&
            response.authenticatorData instanceof ArrayBuffer) {
            const cbor = borc_1.default.encode(new borc_1.default.Tagged(55799, {
                authenticator_data: new Uint8Array(response.authenticatorData),
                client_data_json: new TextDecoder().decode(response.clientDataJSON),
                signature: new Uint8Array(response.signature),
            }));
            if (!cbor) {
                throw new Error('failed to encode cbor');
            }
            return cbor.buffer;
        }
        else {
            throw new Error('Invalid response from WebAuthn.');
        }
    }
    /**
     * Allow for JSON serialization of all information needed to reuse this identity.
     */
    toJSON() {
        return {
            publicKey: (0, agent_1.toHex)(this._publicKey.getCose()),
            rawId: (0, agent_1.toHex)(this.rawId),
        };
    }
}
exports.WebAuthnIdentity = WebAuthnIdentity;
//# sourceMappingURL=webauthn.js.map