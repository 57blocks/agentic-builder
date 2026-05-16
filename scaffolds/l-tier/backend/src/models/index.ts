import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { sequelize } from "../db";
/**
 * Model Definition Demo
 */
// export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
//   declare id: CreationOptional<number>;
//   declare name: string;
//   declare email: string;
//   declare passwordHash: string;
// }

// User.init(
//   {
//     id: {
//       type: DataTypes.INTEGER,
//       autoIncrement: true,
//       primaryKey: true,
//     },
//     name: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//     email: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true,
//     },
//     passwordHash: {
//       type: DataTypes.STRING,
//       allowNull: false,
//     },
//   },
//   {
//     sequelize,
//     modelName: 'User',
//   }
// );

export async function syncModels(): Promise<void> {
  // Migrations under `src/database/migrations/` are the source of truth for
  // schema changes. `sync({ alter: true })` re-runs DDL on every boot which
  // re-triggers any latent issue in the model definitions (e.g. JSONB
  // `defaultValue: {}` crashes Sequelize's SQL serializer with "Invalid value
  // {}"). Default to `alter: false`; opt in only when the developer explicitly
  // sets `DB_SYNC_ALTER=true` for a quick local schema sync without writing a
  // migration.
  const syncAlter = process.env.DB_SYNC_ALTER === "true";
  await sequelize.sync({ alter: syncAlter });
}
