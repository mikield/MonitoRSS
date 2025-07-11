import { ModelDefinition, Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Model } from "mongoose";
import { SubscriptionStatus } from "../../../common/constants/subscription-status.constants";
import { SubscriptionProductKey } from "../../supporter-subscriptions/constants/subscription-product-key.constants";

@Schema({
  _id: false,
  versionKey: false,
  timestamps: false,
})
class PaddleCustomerBenefits {
  @Prop({
    required: true,
  })
  maxUserFeeds: number;

  @Prop({
    required: true,
  })
  allowWebhooks: boolean;

  @Prop({
    required: true,
  })
  dailyArticleLimit: number;

  @Prop({
    required: true,
  })
  refreshRateSeconds: number;
}

const PaddleCustomerBenefitsSchema = SchemaFactory.createForClass(
  PaddleCustomerBenefits
);

@Schema({
  _id: false,
  versionKey: false,
  timestamps: false,
})
class PaddleCustomerSubscriptionAddon {
  @Prop({
    required: true,
    type: String,
    enum: [SubscriptionProductKey.Tier3AdditionalFeed],
  })
  key: SubscriptionProductKey;

  @Prop({
    required: true,
  })
  quantity: number;
}

const PaddleCustomerSubscriptionAddonSchema = SchemaFactory.createForClass(
  PaddleCustomerSubscriptionAddon
);

@Schema({
  _id: false,
  versionKey: false,
  timestamps: false,
})
class PaddleCustomerSubscription {
  @Prop({
    required: true,
    enum: Object.values(SubscriptionProductKey),
    type: String,
  })
  productKey: SubscriptionProductKey;

  @Prop({
    required: true,
  })
  id: string;

  @Prop({
    required: true,
    type: String,
    enum: Object.values(SubscriptionStatus),
  })
  status: SubscriptionStatus;

  @Prop({
    required: true,
    type: String,
  })
  currencyCode: string;

  @Prop({
    type: Date,
  })
  cancellationDate?: Date | null;

  @Prop({
    type: Date,
  })
  nextBillDate?: Date | null;

  @Prop({
    required: true,
    type: Date,
  })
  billingPeriodStart: Date;

  @Prop({
    required: true,
    type: Date,
  })
  billingPeriodEnd: Date;

  @Prop({
    type: String,
    enum: ["month", "year"],
    required: true,
  })
  billingInterval: "month" | "year";

  @Prop({
    required: true,
    type: PaddleCustomerBenefitsSchema,
  })
  benefits: PaddleCustomerBenefits;

  @Prop({
    type: [PaddleCustomerSubscriptionAddonSchema],
    default: [],
  })
  addons?: PaddleCustomerSubscriptionAddon[];

  @Prop({
    required: true,
  })
  createdAt: Date;

  @Prop({
    required: true,
  })
  updatedAt: Date;
}

const PaddleCustomerSubscriptionSchema = SchemaFactory.createForClass(
  PaddleCustomerSubscription
);

@Schema({
  _id: false,
  versionKey: false,
  timestamps: true,
})
class PaddleCustomer {
  @Prop({
    required: true,
  })
  customerId: string;

  @Prop({
    type: PaddleCustomerSubscriptionSchema,
  })
  subscription?: PaddleCustomerSubscription | null;

  @Prop({ required: true })
  lastCurrencyCodeUsed: string;

  @Prop({
    required: true,
  })
  email: string;

  createdAt: Date;

  updatedAt: Date;
}

const PaddleCustomerSchema = SchemaFactory.createForClass(PaddleCustomer);

@Schema({
  collection: "supporters",
})
export class Supporter {
  @Prop({
    required: true,
    type: String,
  })
  _id: string;

  @Prop()
  patron?: boolean;

  @Prop()
  stripe?: boolean;

  @Prop()
  webhook?: boolean;

  @Prop()
  maxGuilds?: number;

  @Prop()
  maxFeeds?: number;

  @Prop()
  maxUserFeeds?: number;

  @Prop()
  allowCustomPlaceholders?: boolean;

  @Prop({
    type: [String],
    required: true,
    default: [],
  })
  guilds: string[];

  @Prop()
  expireAt?: Date;

  @Prop({
    required: true,
    type: PaddleCustomerSchema,
  })
  paddleCustomer?: PaddleCustomer;
}

export type SupporterDocument = Supporter & Document;
export type SupporterModel = Model<SupporterDocument>;
export const SupporterSchema = SchemaFactory.createForClass(Supporter);
export const SupporterFeature: ModelDefinition = {
  name: Supporter.name,
  schema: SupporterSchema,
};
