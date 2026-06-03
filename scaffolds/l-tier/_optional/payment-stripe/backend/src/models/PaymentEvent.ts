/**
 * PaymentEvent model — owned by the `payment-stripe` optional scaffold.
 *
 * One row per Stripe webhook event we have processed. The UNIQUE constraint
 * on `stripeEventId` is the idempotency key: Stripe retries delivery (and may
 * deliver the same event more than once), so the webhook handler inserts here
 * FIRST and treats a unique-violation as "already handled → ack and return".
 *
 * `payload` keeps the raw event for audit / replay. `paymentId` links back to
 * the `Payment` row the event mutated, when one exists.
 */

import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";

export class PaymentEvent extends Model<
  InferAttributes<PaymentEvent>,
  InferCreationAttributes<PaymentEvent>
> {
  declare id: CreationOptional<string>;
  declare stripeEventId: string;
  declare type: string;
  declare paymentId: CreationOptional<string | null>;
  declare payload: CreationOptional<Record<string, unknown>>;
  declare createdAt: CreationOptional<Date>;
}

PaymentEvent.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    stripeEventId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "stripe_event_id",
    },
    type: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "type",
    },
    paymentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "payment_id",
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      // Thunk default — never a shared literal (see README §7.3).
      defaultValue: () => ({}),
      field: "payload",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    modelName: "PaymentEvent",
    tableName: "payment_events",
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [{ unique: true, fields: ["stripe_event_id"] }],
  },
);
