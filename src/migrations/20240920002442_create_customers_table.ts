import type { Knex } from "knex";

  export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("customers", (table) => {
      table.integer("Index");
      table.string('Customer Id').primary();
      table.string('First Name');
      table.string('Last Name');
      table.string('Company');
      table.string('City');
      table.string('Country');
      table.string('Phone 1');
      table.string('Phone 2');
      table.string('Email');
      table.date('Subscription Date');
      table.string('Website');
    });
  }
  
  export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("customers");
  }
