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
    env: 'dev',
    container_name: 'container4bi',
    csv_working: 'working/pos-data.csv',
    csv_complete: 'complete/pos-data.csv'
};

module.exports = configs;