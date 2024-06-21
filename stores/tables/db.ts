import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import type { Database } from "sqlite";

let instance: BunSQLiteDatabase | undefined;

export const db = {
  set instance(db: Database) {
    instance = drizzle(db);
    createTables(db);
  },

  /**
   * Drizzle instance for the database.
   */
  get instance(): BunSQLiteDatabase {
    if (instance === undefined) {
      throw new Error("Event Store: Database instance has not been resolved!");
    }
    return instance;
  },

  /**
   * Creates an insert query.
   *
   * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert}
   *
   * @param table The table to insert into.
   *
   * @example
   *
   * ```ts
   * // Insert one row
   * await db.insert(cars).values({ brand: 'BMW' });
   *
   * // Insert multiple rows
   * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
   *
   * // Insert with returning clause
   * const insertedCar: Car[] = await db.insert(cars)
   *   .values({ brand: 'BMW' })
   *   .returning();
   * ```
   */
  get insert() {
    return this.instance.insert.bind(this.instance);
  },

  /**
   * Creates a select query.
   *
   * Calling this method with no arguments will select all columns from the table. Pass a selection object to specify the columns you want to select.
   *
   * Use `.from()` method to specify which table to select from.
   *
   * See docs: {@link https://orm.drizzle.team/docs/select}
   *
   * @param fields The selection object.
   *
   * @example
   *
   * ```ts
   * // Select all columns and all rows from the 'cars' table
   * const allCars: Car[] = await db.select().from(cars);
   *
   * // Select specific columns and all rows from the 'cars' table
   * const carsIdsAndBrands: { id: number; brand: string }[] = await db.select({
   *   id: cars.id,
   *   brand: cars.brand
   * })
   *   .from(cars);
   * ```
   *
   * Like in SQL, you can use arbitrary expressions as selection fields, not just table columns:
   *
   * ```ts
   * // Select specific columns along with expression and all rows from the 'cars' table
   * const carsIdsAndLowerNames: { id: number; lowerBrand: string }[] = await db.select({
   *   id: cars.id,
   *   lowerBrand: sql<string>`lower(${cars.brand})`,
   * })
   *   .from(cars);
   * ```
   */
  get select() {
    return this.instance.select.bind(this.instance);
  },

  /**
   * Creates an insert query.
   *
   * Calling this method will create new rows in a table. Use `.values()` method to specify which values to insert.
   *
   * See docs: {@link https://orm.drizzle.team/docs/insert}
   *
   * @param table The table to insert into.
   *
   * @example
   *
   * ```ts
   * // Insert one row
   * await db.insert(cars).values({ brand: 'BMW' });
   *
   * // Insert multiple rows
   * await db.insert(cars).values([{ brand: 'BMW' }, { brand: 'Porsche' }]);
   *
   * // Insert with returning clause
   * const insertedCar: Car[] = await db.insert(cars)
   *   .values({ brand: 'BMW' })
   *   .returning();
   * ```
   */
  get update() {
    return this.instance.update.bind(this.instance);
  },

  /**
   * Creates a delete query.
   *
   * Calling this method without `.where()` clause will delete all rows in a table. The `.where()`
   * clause specifies which rows should be deleted.
   *
   * See docs: {@link https://orm.drizzle.team/docs/delete}
   *
   * @param table The table to delete from.
   *
   * @example
   *
   * ```ts
   * // Delete all rows in the 'cars' table
   * await db.delete(cars);
   *
   * // Delete rows with filters and conditions
   * await db.delete(cars).where(eq(cars.color, 'green'));
   *
   * // Delete with returning clause
   * const deletedCar: Car[] = await db.delete(cars)
   *   .where(eq(cars.id, 1))
   *   .returning();
   * ```
   */
  get delete() {
    return this.instance.delete.bind(this.instance);
  },

  /**
   * Closes the client connection.
   */
  close() {
    instance = undefined;
  },
} as const;

/*
 |--------------------------------------------------------------------------------
 | Bootstrap
 |--------------------------------------------------------------------------------
 */

async function createTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS valkyr_roles (
      role_id     TEXT PRIMARY KEY,
      tenant_id   TEXT NOT NULL,
      name        TEXT NOT NULL,
      permissions TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS 'tenant_id_idx' ON 'valkyr_roles' ('tenant_id');

    CREATE TABLE IF NOT EXISTS valkyr_role_users (
      role_id    TEXT NOT NULL,
      user_id    TEXT NOT NULL,
      conditions TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS 'role_id_idx' ON 'valkyr_role_users' ('role_id');
    CREATE INDEX IF NOT EXISTS 'user_id_idx' ON 'valkyr_role_users' ('user_id');
  `);
}
