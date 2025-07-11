export interface PaddleSubscriptionPreviewResponse {
  data: {
    immediate_transaction: {
      billing_period: {
        starts_at: string;
        ends_at: string;
      };
      details: {
        line_items: Array<{
          price_id: string;
          quantity: number; // will be negative for prorata, as its own unique line item
          totals: {
            subtotal: string; // will be negative for prorata
            tax: string;
            discount: string;
            total: string;
          };
          unit_totals: {
            subtotal: string;
            total: string;
            discount: string;
            tax: string;
          };
          proration: {
            rate: string; // for example, 0.99819 if just subscribed
            billing_period: {
              starts_at: string;
              ends_at: string;
            };
          };
          product: {
            id: string;
            name: string;
            custom_data?: {
              key?: string;
            };
          };
        }>;
        totals: {
          /**
           * Subtotal before discount, tax, and deductions. If an item, unit price multiplied by quantity.
           */
          subtotal: string;
          /**
           * Total tax on the subtotal.
           */
          tax: string;
          /**
           * Total after discount and tax, before credits
           */
          total: string;
          /**
           * Total credit applied to this transaction.
           * This includes credits applied using a customer's credit balance and adjustments to a billed transaction.
           */
          credit: string;
          /**
           * Total due on a transaction after credits but before any payments.
           * Q: What is "payments"?
           */
          grand_total: string;
          /**
           * Total due on a transaction after credits and any payments.
           * This is likely irrelevant for subscription previews
           * https://developer.paddle.com/changelog/2023/transaction-totals-grand-total
           */
          balance: string;
        };
      };
    } | null;
  };
}
