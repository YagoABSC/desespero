const dotenv = require('dotenv');
dotenv.config();

let knex = require('knex')(
    {
        client: 'mysql2',
        connection: {
            host: process.env.HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASS,
            database: process.env.DB_NAME,
        }
    }
);
// let knex = require('knex')(
//     {
//         client: 'mysql2',
//         connection: {
//             host: "localhost",
//             user: "root",
//             password: "",
//             database: "em_obra",
//         }
//     }
// );

// Testando a conexão com o banco de dados
knex.raw('SELECT 1')
    .then(() => {
        console.log('conectado com banco!');
    })
    .catch((err) => {
        console.error('Erro ao conectar ao banco de dados:', err);
    });

module.exports = knex;
