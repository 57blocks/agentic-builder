/**
 * Payment model — owned by the `payment-stripe` optional scaffold.
 *
 * Self-contained: it does NOT declare a Sequelize association to `User` so
 * the overlay can be applied to projects that have no auth scaffold at all.
 * `userId` is a plain nullable UUID column — when an auth scaffold IS present,
 * resolve `ctx.state.user.id` to a DB user row first and store that row's
 * `id` here (see this overlay's README §Hard rules).
 *
 * Money is stored as an INTEGER in the smallest currency unit (cents for USD,
 * etc.), exactly as Stripe reports `amount_total`. Never use a float column.
 */

import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";

export type PaymentMode = "payment" | "subscription";
export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "canceled"
  | "refunded";

export class Payment extends Model<
  InferAttributes<Payment>,
  InferCreationAttributes<Payment>
> {
  declare id: CreationOptional<string>;
  declare userId: CreationOptional<string | null>;
  declare stripeSessionId: string;
  declare stripePaymentIntentId: CreationOptional<string | null>;
  declare stripeCustomerId: CreationOptional<string | null>;
  declare mode: PaymentMode;
  declare status: PaymentStatus;
  declare amountTotal: CreationOptional<number | null>;
  declare currency: CreationOptional<string | null>;
  declare metadata: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Payment.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "user_id",
    },
    stripeSessionId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "stripe_session_id",
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "stripe_payment_intent_id",
    },
    stripeCustomerId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "stripe_customer_id",
    },
    mode: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "payment",
      field: "mode",
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "pending",
      field: "status",
    },
    amountTotal: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "amount_total",
    },
    currency: {
      type: DataTypes.STRING(3),
      allowNull: true,
      field: "currency",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      // JSONB defaults MUST be a thunk, never a literal `{}` — a shared
      // literal makes Sequelize emit a broken DDL default (see README §7.3).
      defaultValue: () => ({}),
      field: "metadata",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "Payment",
    tableName: "payments",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["status"] },
      { unique: true, fields: ["stripe_session_id"] },
    ],
  },
);
