require("dotenv").config();

console.log(
  process.env.DATABASE,
  process.env.USER_NAME,
  process.env.PASSWORD,
  process.env.HOST,
  process.env.PORT
);

module.exports = {
  client: "pg",
  connection: {
    database: process.env.DATABASE,
    user: process.env.USER_NAME,
    password: process.env.PASSWORD,
    host: process.env.HOST,
    port: process.env.PORT,
    insecureAuth: true,
  },
  pool: {
    min: 2,
    max: 10,
  },
};
