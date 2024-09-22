import type { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("organizations", (table) => {
      table.integer("Index");
      table.string('Organization Id').primary();
      table.string('Name');
      table.string('Website');
      table.string('Country');
      table.string('Description');
      table.integer('Founded');
      table.string('Industry');
      table.integer('Number of employees');
    });
  }
  
  export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("organizations");
  }

