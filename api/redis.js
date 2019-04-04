const redis = require("redis"),
    host = process.env.REDIS_HOST || '127.0.0.1',
    port = process.env.REDIS_PORT || '6379',
    db = process.env.REDIS_DB || 0,
    password = process.env.REDIS_PASSWORD;

let redisOptions = {
    host: host,
    port: port
};

if (password && db) {
    redisOptions["db"] = db;
    redisOptions["password"] = password
}

const client = redis.createClient(redisOptions);
if (password) {
    client.auth(password);
}

module.exports = client;