const configs = {
    mssql: {
        user: 'aggregationAdmin',
        password: 'TTTS!admin',
        server: 'ttts-data-aggregation-development-sqlserver.database.windows.net',
        database: 'ttts-data-aggregation-development-sqldatabase',
        options: {
            encrypt: true
        }
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