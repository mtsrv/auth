import Knex from 'knex'
export const knex = Knex({ client: 'sqlite3', useNullAsDefault: true })
