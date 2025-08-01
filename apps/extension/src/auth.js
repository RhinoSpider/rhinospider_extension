import { AuthClient } from "@dfinity/auth-client";
import { Principal } from "@dfinity/principal";

const IDENTITY_PROVIDER = "https://identity.ic0.app";
const ONE_DAY_NANO_SECONDS = BigInt(1000 * 1000 * 1000 * 60 * 60 * 24);

let authClient;

async function getAuthClient() {
  if (!authClient) {
    authClient = await AuthClient.create();
  }
  return authClient;
}

export async function login() {
  const client = await getAuthClient();
  return new Promise((resolve, reject) => {
    client.login({
      identityProvider: IDENTITY_PROVIDER,
      onSuccess: () => {
        console.log("Login successful!");
        resolve(client.getIdentity().getPrincipal());
      },
      onError: (error) => {
        console.error("Login failed:", error);
        reject(error);
      },
      maxTimeToLive: ONE_DAY_NANO_SECONDS, // Keep session alive for 1 day
    });
  });
}

export async function logout() {
  const client = await getAuthClient();
  await client.logout();
  console.log("Logged out.");
}

export async function getPrincipal() {
  const client = await getAuthClient();
  if (client.isAuthenticated()) {
    return client.getIdentity().getPrincipal();
  } else {
    return Principal.anonymous();
  }
}

export async function isAuthenticated() {
  const client = await getAuthClient();
  return client.isAuthenticated();
}