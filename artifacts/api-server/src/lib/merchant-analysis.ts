const RULES = [
  { category: "Settlement", words: ["settlement", "settled", "pending"] },
  { category: "Payment failures", words: ["payment", "failed", "declined"] },
  { category: "Refunds", words: ["refund", "refunded"] },
  { category: "Payouts", words: ["payout", "withdraw"] },
  { category: "KYC", words: ["kyc", "verification", "document"] },
  { category: "Onboarding", words: ["onboarding", "setup", "activate"] },
  { category: "Dashboard", words: ["dashboard", "report", "analytics"] },
  { category: "Support", words: ["support", "agent", "response"] },
];

export function classifyFeedback(message: string) {
  const lower = message.toLowerCase();
  const match = RULES.find((rule) => rule.words.some((word) => lower.includes(word)));
  const category = match?.category ?? "Support";
  const severe = ["blocked", "urgent", "days", "failed", "still pending"].some((word) => lower.includes(word));
  const positive = ["great", "helpful", "resolved", "easy"].some((word) => lower.includes(word));
  return {
    category,
    sentiment: positive ? "Positive" : severe ? "Negative" : "Neutral",
    severity: severe ? "High" : "Medium",
    summary: message.length > 120 ? `${message.slice(0, 117)}...` : message,
    keywords: [...new Set([category.toLowerCase(), ...(match?.words.filter((word) => lower.includes(word)) ?? [])])],
  };
}