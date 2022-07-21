import Knex from "knex";
import configuration from "../knexfile.js";

const db = Knex(configuration);

export default db;

export const insertUrl = async (req: any, nameTable: string) => {
  await db(nameTable)
    .insert(req)
    .onConflict("url")
    .ignore()
    .then(() => {
      console.log("Ok ", nameTable);
    })
    .catch((error: any) => {
      console.log("error: ,", error);
    });
};

export const createTableWithURLs = async (nameTable: string) => {
  if (!(await db.schema.hasTable(nameTable))) {
    await db.schema.createTable(nameTable, (table) => {
      table.increments("id").primary().unsigned();
      table.text("url").unique();
    });
  }
};
