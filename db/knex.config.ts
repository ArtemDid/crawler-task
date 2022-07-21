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
