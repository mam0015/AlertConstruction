// A one-time key for one press of a "send/create" button. The same key is sent again if the first answer was lost, so the server can
// recognise a repeat and never save the same thing twice. A new key is made once the server has confirmed it.
export function newClientKey() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}
