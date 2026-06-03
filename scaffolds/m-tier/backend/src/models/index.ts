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
  // The Sequelize models are the SINGLE source of truth for the schema —
  // there are no migrations. On a fresh database a bare `sync()` issues
  // CREATE TABLE for every model (all columns + declared indexes included,
  // so no model/schema drift is possible); on a restart against an existing
  // schema it is a no-op, preserving data. Escape hatches for local model
  // iteration (leave BOTH unset in CI / preview — the DB is provisioned fresh
  // per run):
  //   DB_SYNC_FORCE=true → DROP & recreate every table (clean rebuild)
  //   DB_SYNC_ALTER=true → ALTER existing tables to match models. Use
  //     sparingly: re-running DDL every boot can re-trigger latent model
  //     issues (e.g. JSONB `defaultValue: {}` crashing Sequelize's serializer).
  if (process.env.DB_SYNC_FORCE === "true") {
    await sequelize.sync({ force: true });
  } else if (process.env.DB_SYNC_ALTER === "true") {
    await sequelize.sync({ alter: true });
  } else {
    await sequelize.sync();
  }
}
