
exports.up = function (knex, Promise) {
	return Promise.all([
		knex.schema
			.createTableIfNotExists('users', function (usersTable) {
				// Primary Key
                usersTable.increments('id').primary();

                // Data
                usersTable.string( 'name', 50 ).notNullable();
                usersTable.integer( 'phone', 50 ).notNullable().unique();
                usersTable.string( 'email', 250 ).defaultTo("").unique();
                usersTable.string( 'password', 128 ).notNullable();

                usersTable.timestamps(true, true)


			})
			.createTableIfNotExists('contacts', function (contactsTable) {

				// Primary Key
                contactsTable.increments('id').primary();

                // Data
                contactsTable.string( 'name', 50 ).notNullable();
                contactsTable.integer( 'phone', 50 ).notNullable();
				usersTable.string( 'email', 250 ).defaultTo("");
				contactsTable.integer('user_id',11).unsigned().references('id').inTable('users');

                contactsTable.timestamps(true, true)

			})
			.createTableIfNotExists('users_contacts', function(usersContacts){
				// Primary Key
                usersContacts.increments().primary();

                usersContacts.integer('user_id',11).unsigned().references('id').inTable('users');
            	usersContacts.integer('contact_id',11).unsigned().references('id').inTable('contacts');

			})
			.createTableIfNotExists('spam', function(spanContacts){
				// Primary Key
                spanContacts.increments().primary();

                spanContacts.string( 'phone', 50 ).notNullable().unique();

                spanContacts.integer('spam_count')

			})

	]);

};

exports.down = function (knex, Promise) {
	return Promise.all([
		//remember to drop a refrencing table first
		knex
			.schema
			.dropTableIfExists('users')
			.dropTableIfExists('contacts')
	]);

};