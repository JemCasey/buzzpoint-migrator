const Database = require('better-sqlite3');

// Create or open the SQLite database file
const db = new Database('database.db');
const { shortenAnswerline, removeTags } = require('./utils');
const slugify = require('slugify');

const getStatement = db.prepare('SELECT answer FROM tossup');
const answers = getStatement.all();
const slugifyOptions = {
    lower: true,
    strict: true
}

for (let { answer } of answers) {
    console.log(slugify(shortenAnswerline(removeTags(answer)), slugifyOptions));
}

