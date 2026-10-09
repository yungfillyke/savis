// Simulated SAVIS Wallet (prototype — no real money)

export type WalletTx = {
  id: string;
  type: "hold" | "release" | "refund" | "topup" | "withdraw";
  amount: number;
  label: string;
  jobId?: string;
  createdAt: string;
};

const BALANCE_KEY = "savis_wallet_balance";
const TX_KEY = "savis_wallet_tx";
const PROVIDER_AVAILABLE_KEY = "savis_provider_available";
const PROVIDER_TX_KEY = "savis_provider_tx";

export function getBalance(): number {
  if (typeof window === "undefined") return 5000;
  const v = localStorage.getItem(BALANCE_KEY);
  if (v === null) {
    localStorage.setItem(BALANCE_KEY, "5000");
    return 5000;
  }
  return Number(v) || 0;
}

function setBalance(n: number) {
  localStorage.setItem(BALANCE_KEY, String(Math.max(0, n)));
}

export function getTransactions(): WalletTx[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(TX_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushTx(tx: Omit<WalletTx, "id" | "createdAt">) {
  const list = getTransactions();
  list.unshift({
    ...tx,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(TX_KEY, JSON.stringify(list.slice(0, 50)));
}

/** Hold funds for a job (escrow) — consumer side */
export function holdForJob(
  amount: number,
  jobId: string,
  label: string
): { ok: boolean; message: string } {
  const bal = getBalance();
  if (amount > bal) {
    return {
      ok: false,
      message: `Not enough balance. You have KSh ${bal.toLocaleString()}.`,
    };
  }
  setBalance(bal - amount);
  pushTx({ type: "hold", amount, label, jobId });
  return { ok: true, message: "Held in SAVIS Wallet escrow" };
}

/** Release to provider when job completes */
export function releaseForJob(
  amount: number,
  jobId: string,
  label: string
): void {
  pushTx({ type: "release", amount, label, jobId });
  // Credit provider available balance
  creditProvider(amount, jobId, label);
}

/** Refund on decline */
export function refundForJob(
  amount: number,
  jobId: string,
  label: string
): void {
  setBalance(getBalance() + amount);
  pushTx({ type: "refund", amount, label, jobId });
}

export function topUp(amount: number): void {
  setBalance(getBalance() + amount);
  pushTx({ type: "topup", amount, label: "M-Pesa top-up (sample)" });
}

// ─── Provider earnings (available for withdrawal) ───────────────────────────

export function getProviderAvailable(): number {
  if (typeof window === "undefined") return 0;
  return Number(localStorage.getItem(PROVIDER_AVAILABLE_KEY) || "0") || 0;
}

function setProviderAvailable(n: number) {
  localStorage.setItem(PROVIDER_AVAILABLE_KEY, String(Math.max(0, n)));
}

export function getProviderTransactions(): WalletTx[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(PROVIDER_TX_KEY) || "[]");
  } catch {
    return [];
  }
}

function pushProviderTx(tx: Omit<WalletTx, "id" | "createdAt">) {
  const list = getProviderTransactions();
  list.unshift({
    ...tx,
    id: `p-${Date.now()}`,
    createdAt: new Date().toISOString(),
  });
  localStorage.setItem(PROVIDER_TX_KEY, JSON.stringify(list.slice(0, 50)));
}

function creditProvider(amount: number, jobId: string, label: string) {
  setProviderAvailable(getProviderAvailable() + amount);
  pushProviderTx({ type: "release", amount, label, jobId });
}

/** Provider withdraws available balance to M-Pesa (prototype) */
export function withdrawProvider(amount: number): { ok: boolean; message: string } {
  const available = getProviderAvailable();
  if (amount <= 0 || amount > available) {
    return {
      ok: false,
      message: `You can withdraw up to KSh ${available.toLocaleString()}.`,
    };
  }
  setProviderAvailable(available - amount);
  pushProviderTx({
    type: "withdraw",
    amount,
    label: "Withdraw to M-Pesa (sample)",
  });
  return { ok: true, message: `KSh ${amount.toLocaleString()} sent to M-Pesa (prototype)` };
}
