export type CustomerHelpTopic =
  | "whatsapp"
  | "verification"
  | "numbers"
  | "wallet"
  | "orders"
  | "general";

export function getCustomerHelp(topic: CustomerHelpTopic): string {
  switch (topic) {
    case "whatsapp":
      return `I can help with WhatsApp setup and number restrictions.

If a number is restricted or rejected by WhatsApp, possible reasons include previous activity on the number, repeated verification attempts, unusual registration activity, spam-like behavior, or WhatsApp's automated anti-abuse systems.

For a smoother setup:
• You can use a reputable VPN while registering if you need a consistent network connection. A VPN does not guarantee that WhatsApp will accept the number or prevent restrictions.
• Use the number normally and gradually.
• Don't send bulk unsolicited messages.
• Don't repeatedly request verification codes.
• Avoid automation or unofficial WhatsApp clients.
• Follow WhatsApp's Terms and messaging rules.
• If a restriction appears to be a mistake, use WhatsApp's official review/appeal process.

NumberHub provides the number, but we cannot guarantee that a third-party platform will accept or permanently retain it.`;

    case "verification":
      return `For verification problems, first check that the number is displayed correctly and that you are using the exact service you selected.

If you are waiting for an OTP, don't repeatedly request new codes. You can ask me "Where is my code?" and I'll check your active verification when live supplier information is available.

If an OTP has actually arrived, I'll show the real code. I won't invent or guess a verification code.`;

    case "numbers":
      return `I can help you find an available verification number.

Tell me the country and service you need, for example:
"I need a US WhatsApp number"

I'll check the available NumberHub options and show you the current prices and availability. You can then tell me which option you want to buy.`;

    case "wallet":
      return `I can help with your NumberHub wallet.

You can ask:
• "How much is in my wallet?"
• "How do I fund my wallet?"
• "My payment hasn't reflected."
• "I was charged but my wallet wasn't credited."

For your actual balance or order-related information, I'll use your NumberHub account data rather than guessing.`;

    case "orders":
      return `I can help you track your NumberHub orders.

You can ask:
• "Show my orders"
• "Where is my number?"
• "What's happening with my order?"
• "Where is my OTP?"
• "Can I get a refund?"

For an active verification, I'll check the real order and supplier information available for your account.`;

    case "general":
      return `I'm your NumberHub assistant. I can help you find numbers, check availability and prices, buy numbers through the assistant, check your wallet, track orders, monitor verification numbers and OTPs, and explain common verification problems.

If you're not sure what to ask, simply tell me what you're trying to do and I'll guide you.`;

    default:
      return `Tell me what you're trying to do and I'll guide you through it. I can help with NumberHub numbers, purchases, wallets, orders, OTPs, WhatsApp setup and common verification problems.`;
  }
}
