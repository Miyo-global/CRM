

import Ably from "ably";

let client: Ably.Realtime | null = null;

export function getAblyClient(): Ably.Realtime {
  if (!client) {
    client = new Ably.Realtime({
      authUrl: "/api/chat/ably-token",
      authMethod: "GET",

      autoConnect: false,
    });
  }
  return client;
}
