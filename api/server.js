import Hapi from "hapi";
import routes from "./routes.js";
const redisClient = require("./redis");

require('dotenv').config();

export const server = new Hapi.Server({ port: 3000, host: 'localhost' });

// validation function
const validate = async (user, decoded, request) => {
    return new Promise((resolve, reject) => {
        // checks to see if the person is valid
        if (!user) {
            return resolve({ isValid: false });
        }
        else {
            redisClient.hget('blacklistedTokens', decoded.auth.token, function (err, data) {
                if (data) {
                    return resolve({ isValid: false });
                } else {
                    return resolve({ isValid: true });
                }
            })
        }
    })
}

async function start() {
    //normal jwt authentication plugin
    await server.register(require('hapi-auth-jwt2'));

    server.auth.strategy('jwt', 'jwt',
        {
            key: process.env.SECRET_KEY,
            validate: validate,
            verifyOptions: { algorithms: ['HS256'] }
        });

    routes.forEach( ( route ) => {
        server.route( route );
    } );

    try {
        await server.start();
    }
    catch (err) {
        // Fancy error handling here
        console.error( "Error was handled!" );
        console.error( err );
    }
    console.log( `Server started at ${ server.info.uri }` );
}

start();