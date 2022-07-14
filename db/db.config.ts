const Knex = require("knex");
const configuration = require("../knexfile.js");

module.exports = Knex(configuration);
