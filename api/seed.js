const knexfile = require('../knexfile.js');
const knex = require('knex')(knexfile.development);

const async = require('async');

const sample_data = require('./sample_data')


async.series([
		function(callback){
			const promises = sample_data.default_users.map((row) =>
			    new Promise((resolve, reject)=> {
			        knex('users').insert(row).then(() => {
			            resolve("inserted");
			        });
			    })
			  );
			Promise.all(promises)
			    .then((data) =>
			        {
			            callback(null)
			            // console.log(data);
			        })
			    .catch((error) => {
			        console.log(error);
			        callback(null)
			    });
		},
		function(callback){
			const promises = sample_data.default_contacts.map((row) =>
			    new Promise((resolve, reject)=> {
			        knex('contacts').insert(row).then(() => {
			            resolve("inserted");
			        });
			    })
			  );
			Promise.all(promises)
			    .then((data) =>
			        {
			            callback(null)
			            // console.log(data);
			        })
			    .catch((error) => {
			        console.log(error);
			        callback(null)
			    });
		}
	], function(e){
		console.log("done")
		if (e) console.log(e)

		const promises = sample_data.default_users_contacts.map((row) =>
		    new Promise((resolve, reject)=> {
		        knex('users_contacts').insert(row).then(() => {
		            resolve("inserted");
		        });
		    })
		  );
		Promise.all(promises)
		    .then((data) =>
		        {
		            process.exit();
		            // console.log(data);
		        })
		    .catch((error) => {
		        console.log(error);
		        process.exit();
		    });

	})



