import knex from "./knex";
import server from "./server";

const Boom = require('boom');
const Joi = require('joi');
const JWT = require('jsonwebtoken');
const redisClient = require("./redis");

const async = require('async');


require('dotenv').config();

let routes = [
{
    path: "/",
    method: "GET",
    config:{
        auth: 'jwt',
    },
    handler: (request, reply) => {
        return 'Hello World'
    }
},
{
    path: '/signup',
    method: "POST",
    config:{
        validate: {
            "payload": {
                "name": Joi.string().min(2).max(50).required().trim().description('Name'),
                "phone": Joi.number().required().description('Phone number'),
                "password": Joi.string().required().trim().description('password'),
                "email": Joi.string().email().trim().description('Email address'),
            }
        }
    },
    handler: (request, h) =>{
        let pr = (resolve, reject) =>{

            let new_user_object = {
                "name": request.payload.name,
                "phone": request.payload.phone,
                "password": request.payload.password
            };
            if (request.payload.email) new_user_object.email = request.payload.email;

            const insertOperation = knex('users').insert(new_user_object)
            .then((res) =>{
                console.log(res[0], "user id")
                return resolve(h.response("successfully new user created").code(201));
            }).
            catch((err) =>{
                console.log(err, "eerrrr")
                return Boom.forbidden(err)
            })
        }
        return new Promise(pr)
    }
},
{
    path: "/login",
    method: "POST",
    config:{
        validate: {
            "payload": {
                "phone": Joi.number().required().description('Phone number'),
                "password": Joi.string().required().trim().description('password')
            }
        }
    },
    handler: (request, h) => {
        let pr = (resolve, reject) =>{
            const { phone, password } = request.payload;

            const getOperation = knex('users').where({
                phone,
            }).select('password', 'id').then( ( [user] ) =>{
                console.log(user)
                if (!user){
                    return Boom.forbidden("the specified user was not found")
                } else if ( user.password == password){
                    const token = JWT.sign(
                    { exp: Math.floor(Date.now() / 1000) + 604800, data: user },
                    process.env.SECRET_KEY
                );
                return resolve(h.response({ token: token, user_id: user.id }).code(201));

                } else {
                    console.log("invalid password")
                    return Boom.unauthorized("invalid password")
                }

            }).catch((err) =>{
                console.log(err, "errr")
                return Boom.forbidden(err)
            });
        }
        return new Promise(pr)

    }
},
{
    path: '/logout',
    method: 'POST',
    config:{
        auth: 'jwt',
    },
    handler: (request, h) =>{
        let pr = (resolve, reject) => {
                let session = {
                    id: request.auth.token // a random session id
                };
                const expiredTime = new Date(request.auth.credentials.exp * 1000);
                const today = new Date();
                let seconds = parseInt(Math.abs(expiredTime - today) / 1000);

                redisClient.hset('blacklistedTokens', request.auth.token, JSON.stringify(session), 'EX', seconds, function(
                    err,
                    data
                ) {
                    if (!err) {
                        return resolve(h.response({ message: 'You are cool !' }).code(205));
                    } else {
                        return reject(Boom.badGateway(err));
                    }
                });
            };
            return new Promise(pr);
    }
},
{
    path: '/mark/spam',
    method: 'POST',
    config:{
        auth: 'jwt',
        description: "mark as spam",
        validate: {
            "payload": {
                "phone": Joi.number().required().description('Phone number')
            }
        }
    },
    handler: (request, h) =>{
        let pr = (resolve, reject) =>{
            const spam_data = knex('spam').where({
                phone: request.payload.phone
            }).select('spam_count')
                .then( async ([result]) =>{
                    if (result){
                        //just need to update
                        await knex('spam').where({phone: request.payload.phone}).update('spam_count', result.spam_count + 1)

                        return resolve(h.response("successfully spam updated").code(201));
                    } else {
                        const insertOperation = knex('spam').insert({
                            phone: request.payload.phone,
                            spam_count: 1
                        })
                        .then((res) =>{
                            return resolve(h.response("successfully spam created").code(201));
                        }).
                        catch((err) =>{
                            console.log(err, "eerrrr")
                            return Boom.forbidden(err)
                        })
                    }
                })
                .catch((err) =>{
                    console.log(err, "err")
                    return Boom.forbidden(err)
                })
        }
        return new Promise(pr);
    }
},
{
    path: '/person/details/{phone}',
    method: 'POST',
    config:{
        auth: 'jwt',
        description: 'Clicking a search result displays all the details for that person along with the spam likelihood',
        validate: {
            "params": {
                "phone": Joi.number().required().description('Phone number')
            },
            "payload":{
                "loggedInUserPhone": Joi.number().required().description('Phone number')
            }
        }
    },
    handler: (request, h) =>{
        let pr = (resolve, reject) =>{
            knex('users').where({"phone": request.params.phone}).select('name phone email id')
                .then(([result]) =>{
                    knex('spam').where({"phone": request.params.phone})
                        .then(([spam_result]) =>{
                            let is_spam = false
                            if (spam_result) is_spam = true

                            if (result){
                                //person is registered
                                knex('user').where({"phone": request.payload.loggedInUserPhone})
                                    .then(([data]) =>{
                                        if (data){
                                            return resolve(h.response({
                                                "id": result.id,
                                                "name": result.name,
                                                "phone": result.phone,
                                                "email": result.email
                                                "is_spam": is_spam
                                            }).code(20));
                                        } else {
                                            return resolve(h.response({
                                                "id": result.id,
                                                "name": result.name,
                                                "phone": result.phone,
                                                "is_spam": is_spam
                                            }).code(20));
                                        }
                                    })
                                    .catch((error) =>{
                                        console.log(error, "error")
                                        return Boom.forbidden(error)
                                    })
                            } else {
                                return resolve(h.response({
                                    "id": result.id,
                                    "name": result.name,
                                    "phone": result.phone,
                                    "is_spam": is_spam
                                }).code(20));
                            }

                        })
                        .catch((errr) =>{
                            console.log(errr, "errrr")
                            return Boom.forbidden(errr)
                        })


                })
                .catch((err) =>{
                    console.log(err, "err")
                    return Boom.forbidden(err)
                })
        }
        return new Promise(pr)
    }
},
{
    path: '/search/name/{name}',
    method: 'GET',
    config:{
        auth: 'jwt',
        description: 'User can search for a person by name in the global database',
        validate: {
            "params": {
                "name": Joi.string().required().description('Name from which you want to search')
            }
        }
    },
    handler: (request, h) =>{
        let pr = (request, h) =>{
            let getResults = (tableName) => {
                let query = knex(tableName).where('name', 'like', `%${request.params.name}%`);
                return query.select();
            };

            let final_output = []
            let non_startwith = []

            let searched_data = getResults('users')
            if (searched_data){
                for (var i = searched_data.length - 1; i >= 0; i--) {
                    if (searched_data[i].startsWith(request.params.name)){
                        final_output.push(searched_data[i])
                    } else {
                        non_startwith.push(searched_data[i])
                    }
                }
                for (var j = searched_data.length - 1; j >= 0; j--) {
                    final_output.push(searched_data[j])
                }



                async.mapSeries(final_output, function(object, callback){
                    knex('spam').where({"phone": object.phone})
                        .then(([spam_result]) =>{
                            let is_spam = false
                            if (spam_result) is_spam = true
                            object.is_spam = is_spam
                            callback(null, object)
                        })
                }, function(err,results){
                    return resolve(h.response(results).code(201));
                })


            } else {
                return resolve(h.response("data not found").code(201));
            }
        }
        return new Promise(pr)
    }
},
{
    path: '/search/person/{phone}',
    method: 'GET',
    config:{
        auth: 'jwt',
        description: 'User can search for a person by phone number in the global database.',
        validate: {
            "params": {
                "phone": Joi.number().required().description('Phone number')
            }
        }
    },
    handler: (request, h) =>{
        let pr = (resolve, reject) =>{
            knex('users').where({"phone": request.params.phone})
                .select('name phone email id')
                .then(([result]) =>{
                    if (result){
                        return resolve(h.response(result).code(201));
                    } else {
                        knex('contacts').where({"phone": request.params.phone})
                            .select('name phone email id')
                            .then(([data]) =>{
                                if (data){
                                    return resolve(h.response(data).code(201));
                                } else {
                                    return resolve(h.response("no data found").code(201));
                                }

                            })
                    }
                })
                .catch((err) =>{
                    console.log(err, "errrr")
                    return Boom.forbidden(errr)
                })
        }
        return new Promise(pr)
    }
}
];

export default routes;