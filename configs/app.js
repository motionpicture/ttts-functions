const configs = {
    mssql: {
        user: process.env.MSSQL_USER,
        password: process.env.MSSQL_PASSWORD,
        server: process.env.MSSQL_SERVER,
        database: process.env.MSSQL_DATABASE,
        // user: "aggregationAdmin",
        // password: "TTTS!admin",
        // server: "ttts-data-aggregation-development-sqlserver.database.windows.net",
        // database: "ttts-data-aggregation-development-sqldatabase",
        connectionTimeout: 600000,
        requestTimeout: 600000,
        options: {
            encrypt: true
        },
        pool: {
            max: 100,
            min: 0,
            idleTimeoutMillis: 30000
        }
    },
    mongoose: {
        //The `useMongoClient` option is no longer necessary in mongoose 5.x, please remove it.
        useMongoClient: true,
        autoReconnect: true,
        keepAlive: 120000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 0,
        reconnectTries: 30,
        reconnectInterval: 1000
    },
    csv: {
        csv_101: {
            useHeader: true
        }
    },
    containerName: process.env.AZURE_BLOB_STORAGE,
    // containerName: "container4aggregate",
    maxRecordExec: 500
};

module.exports = configs;