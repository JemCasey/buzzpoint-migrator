const Database = require('better-sqlite3');

// Create or open the SQLite database file
const db = new Database('database.db');
const { shortenAnswerline, removeTags, slugifyOptions } = require('./utils');
const slugify = require('slugify');

const fs = require('fs');
const path = require('path');

const questionSetsPath = './data/question_sets';
const packetsFolderName = 'packet_files';

const insertQuestionSetStatement = db.prepare('INSERT INTO question_set (name, slug, difficulty) VALUES (?, ?, ?)');
const insertPacketStatement = db.prepare('INSERT INTO packet (question_set_id, name) VALUES (?, ?)');
const insertTossupStatement = db.prepare('INSERT INTO tossup (packet_id, question_number, question, answer, slug, metadata, author, editor, category, subcategory, subsubcategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertBonusStatement = db.prepare('INSERT INTO bonus (packet_id, question_number, leadin, leadin_sanitized, slug, metadata, author, editor, category, subcategory, subsubcategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertBonusPartStatement = db.prepare('INSERT INTO bonus_part (bonus_id, part_number, part, part_sanitized, answer, answer_sanitized, value, difficulty_modifier) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
const findQuestionSetStatement = db.prepare('SELECT id FROM question_set WHERE slug = ?');

fs.readdir(questionSetsPath, (err, subFolders) => {
    if (err) {
        console.error('Error reading question sets folder: ', err);
        return;
    }

    subFolders.forEach((subFolder) => {
        const subFolderPath = path.join(questionSetsPath, subFolder);

        const indexPath = path.join(subFolderPath, 'index.json');

        if (!fs.existsSync(indexPath)) {
            console.log(`Skipping ${subFolder} as 'index.json' file not found.`);
            return;
        }

        fs.readFile(indexPath, 'utf8', (err, questionSetData) => {
            if (err) {
                console.error(`Error reading ${indexPath}:`, err);
                return;
            }

            try {
                const questionSet = JSON.parse(questionSetData);
                const packetsFilePath = path.join(subFolderPath, packetsFolderName);
                const { name, slug, difficulty } = questionSet;
                const { id: existingQuestionSetId } = findQuestionSetStatement.get(slug) || {};

                if (!existingQuestionSetId) {
                    const { lastInsertRowid: questionSetId } = insertQuestionSetStatement.run(name, slug, difficulty);

                    if (!fs.existsSync(packetsFilePath)) {
                        console.log(`Skipping ${subFolder} as ${packetsFolderName} folder not found.`);
                        return;
                    }
    
                    fs.readdir(packetsFilePath, (err, gameFiles) => {
                        if (err) {
                            console.error(`Error reading files in ${packetsFilePath}:`, err);
                            return;
                        }
    
                        gameFiles.forEach((packetFile) => {
                            const gameFilePath = path.join(packetsFilePath, packetFile);
                            const roundName = packetFile.split(".")[0];
                            
                            fs.readFile(gameFilePath, 'utf8', (err, packetDataContent) => {
                                if (err) {
                                    console.error(`Error reading ${gameFilePath}:`, err);
                                    return;
                                }
    
                                try {
                                    const regex = new RegExp(questionSet.metadata_regex);
                                    const packetData = JSON.parse(packetDataContent);
                                    const { lastInsertRowid: packetId } = insertPacketStatement.run(questionSetId, roundName);
    
                                    packetData.tossups.forEach(({ question, answer, metadata }, index) => {
                                        const [ _, author, categoryData, editor ] = metadata.match(regex);
                                        const [ category, subcategory, subsubcategory ] = categoryData.split(' - ');
                                        insertTossupStatement.run(packetId, index + 1, question, answer, slugify(shortenAnswerline(removeTags(answer)).slice(0, 50), slugifyOptions), metadata, author, editor, category, subcategory, subsubcategory);
                                    });
                
                                    packetData.bonuses.forEach(({ leadin, leadin_sanitized, metadata, answers, answers_sanitized, parts, parts_sanitized, values, difficultyModifiers }, index) => {
                                        const [ _, author, categoryData, editor ] = metadata.match(regex);
                                        const [ category, subcategory, subsubcategory ] = categoryData.split(' - ');
                                        const { lastInsertRowid: bonusId } = insertBonusStatement.run(
                                            packetId, 
                                            index + 1, 
                                            leadin, 
                                            leadin_sanitized, 
                                            slugify(answers_sanitized.map(a => shortenAnswerline(removeTags(a)).slice(0, 25)).join(' '), slugifyOptions), 
                                            metadata, 
                                            author, 
                                            editor, 
                                            category, 
                                            subcategory, 
                                            subsubcategory
                                        );
                                    
                                        for (let i = 0; i < answers.length; i ++) {
                                            insertBonusPartStatement.run(bonusId, i + 1, parts[i], parts_sanitized[i], answers[i], answers_sanitized[i], values[i], difficultyModifiers[i]);
                                        }
                                    });
                                } catch (err) {
                                    console.error(`Error occurred while parsing JSON in ${gameFilePath} and writing it to db:`, err);
                                }
                            });
                        });
                    });
                } else {
                    console.log(`Skipping ${subFolder} as set is already in databsae`);
                }
            } catch (err) {
                console.error(`Error parsing JSON in ${indexPath}:`, err);
            }
        });
    });
});