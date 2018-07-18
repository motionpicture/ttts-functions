const configs = {
    mssql: {
        user: 'aggregationAdmin',
        password: 'TTTS!admin',
        server: 'ttts-data-aggregation-development-sqlserver.database.windows.net',
        database: 'ttts-data-aggregation-development-sqldatabase',
        connectionTimeout: 600000,
        requestTimeout: 600000,
        options: {
            encrypt: true
        },
        pool: {
            max: 10000,
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
    maxRecordExec: 500,
    containerName: 'container4bi',
    csv_working: 'working/[0-9a-zA-Z-_\\s]+.csv'
};

module.exports = configs;