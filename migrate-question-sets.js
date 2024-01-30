const Database = require('better-sqlite3');

// Create or open the SQLite database file
const db = new Database('database.db');
const { shortenAnswerline, removeTags, slugifyOptions } = require('./utils');
const slugify = require('slugify');

const { existsSync } = require('fs');
const fs = require('fs/promises');
const path = require('path');
const { parseMetadata } = require('./metadata-utils');
const crypto = require('crypto');

require('dotenv').config();

const basePath = process.env.BASE_PATH || './';
const questionSetsPath = path.join(basePath, 'data/question_sets');
const editionsFolderName = 'editions';
const packetsFolderName = 'packet_files';
const overWriteFlag = '--overwrite';
const overWrite = process.argv.find(a => a === overWriteFlag);

const insertQuestionSetStatement = db.prepare('INSERT INTO question_set (name, slug, difficulty) VALUES (?, ?, ?)');
const insertQuestionSetEditionStatement = db.prepare('INSERT INTO question_set_edition (question_set_id, name, slug, date) VALUES (?, ?, ?, ?)');
const insertPacketStatement = db.prepare('INSERT INTO packet (question_set_edition_id, name) VALUES (?, ?)');
const insertPacketQuestionStatement = db.prepare('INSERT INTO packet_question(packet_id, question_number, question_id) VALUES (?, ?, ?)');
const insertQuestionStatement = db.prepare('INSERT INTO question (slug, metadata, author, editor, category, category_slug, subcategory, subcategory_slug, subsubcategory) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
const insertTossupStatement = db.prepare('INSERT INTO tossup (question_id, question, answer, answer_sanitized, answer_primary) VALUES (?, ?, ?, ?, ?)');
const insertBonusStatement = db.prepare('INSERT INTO bonus (question_id, leadin, leadin_sanitized) VALUES (?, ?, ?)');
const insertBonusPartStatement = db.prepare('INSERT INTO bonus_part (bonus_id, part_number, part, part_sanitized, answer, answer_sanitized, answer_primary, value, difficulty_modifier) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
const findQuestionSetStatement = db.prepare('SELECT id FROM question_set WHERE slug = ?');
const findQuestionSetEditionStatement = db.prepare('SELECT question_set_edition.id FROM question_set_edition JOIN question_set ON question_set_id = question_set.id WHERE question_set.slug = ? AND question_set_edition.slug = ? ');
const deleteQuestionSetEditionStatement = db.prepare('DELETE FROM question_set_edition WHERE id = ?');
const insertTossupHashStatement = db.prepare('INSERT INTO tossup_hash (hash, question_id, tossup_id) VALUES (?, ?, ?)');
const insertBonusHashStatement = db.prepare('INSERT INTO bonus_hash (hash, question_id, bonus_id) VALUES (?, ?, ?)');
const findTossupStatement = db.prepare(`
    SELECT  question_id AS questionId,
            tossup_id AS tossupId
    FROM    tossup_hash
    WHERE   hash = ?
`);
const findBonusStatement = db.prepare(`
    SELECT  question_id AS questionId,
            bonus_id AS tossupId
    FROM    bonus_hash
    WHERE   hash = ?
`);

const getHash = (questionText) => {
    return crypto.createHash('md5').update(questionText).digest('hex');
}

const insertTossup = (packetId, questionNumber, question, answer, answer_sanitized, answerSlug, metadata, author, editor, category, subcategory, subsubcategory, slugDictionary) => {
    let questionHash = getHash(`${question}${answer}${metadata}`);
    let { questionId, tossupId } = findTossupStatement.get(questionHash) || {};
    
    if (!questionId) {
        if (slugDictionary[answerSlug]) {
            slugDictionary[answerSlug] += 1;
            answerSlug = answerSlug + '-' + slugDictionary[answerSlug];
        } else {
            slugDictionary[answerSlug] = 1;
        }

        questionId = insertQuestionStatement.run(answerSlug, metadata, author, editor, category, category ? slugify(category.toLowerCase()) : null, subcategory, subcategory ? slugify(subcategory.toLowerCase()) : null, subsubcategory).lastInsertRowid;
        tossupId = insertTossupStatement.run(questionId, question, answer, answer_sanitized, shortenAnswerline(answer_sanitized)).lastInsertRowid;
        insertTossupHashStatement.run(questionHash, questionId, tossupId);
    }

    insertPacketQuestionStatement.run(packetId, questionNumber, questionId);

    return tossupId;
}

const insertBonus = (packetId, questionNumber, leadin, leadin_sanitized, answerSlug, metadata, author, editor, category, subcategory, subsubcategory, answers, answers_sanitized, parts, parts_sanitized, values, difficultyModifiers, slugDictionary) => {
    let questionHash = getHash(`${leadin}${parts.join('')}${answers.join('')}${metadata}`);
    let { questionId, bonusId } = findBonusStatement.get(questionHash) || {};
    
    if (!questionId) {
        if (slugDictionary[answerSlug]) {
            slugDictionary[answerSlug] += 1;
            answerSlug = answerSlug + '-' + slugDictionary[answerSlug];
        } else {
            slugDictionary[answerSlug] = 1;
        }

        questionId = insertQuestionStatement.run(answerSlug, metadata, author, editor, category, category ? slugify(category.toLowerCase()) : null, subcategory, subcategory ? slugify(subcategory.toLowerCase()) : null, subsubcategory).lastInsertRowid;
        bonusId = insertBonusStatement.run(questionId, leadin, leadin_sanitized).lastInsertRowid;
        
        for (let i = 0; i < answers.length; i++) {
            insertBonusPartStatement.run(bonusId, i + 1, 
                parts[i], parts_sanitized ? parts_sanitized[i] : removeTags(parts[i]), 
                answers[i], answers_sanitized ? answers_sanitized[i] : removeTags(answers[i]), 
                answers_sanitized ? shortenAnswerline(answers_sanitized[i]) : shortenAnswerline(removeTags(answers[i])), 
                values ? values[i] : null,
                difficultyModifiers ? difficultyModifiers[i] : null);
        }

        insertBonusHashStatement.run(questionHash, questionId, bonusId);
    }

    insertPacketQuestionStatement.run(packetId, questionNumber, questionId);

    return bonusId;
}

const migrateQuestionSets = async () => {
    try {
        const subFolders = await fs.readdir(questionSetsPath);

        for (const subFolder of subFolders) {
            const subFolderPath = path.join(questionSetsPath, subFolder);
            const indexPath = path.join(subFolderPath, 'index.json');
            let slugDictionary = {};

            if (!existsSync(indexPath)) {
                console.log(`Skipping ${subFolder} as 'index.json' file not found.`);
                continue;
            }
    
            try {
                const questionSetData = await fs.readFile(indexPath, 'utf8');
                const questionSet = JSON.parse(questionSetData);
                const editionsPath = path.join(subFolderPath, editionsFolderName);
                const { name, slug, difficulty } = questionSet;
                let { id: questionSetId } = findQuestionSetStatement.get(slug) || {};
    
                if (!questionSetId) {
                    questionSetId = insertQuestionSetStatement.run(name, slug, difficulty).lastInsertRowid;
                }
    
                if (!existsSync(editionsPath)) {
                    console.log(`Skipping ${subFolder} as ${editionsPath} folder not found.`);
                    continue;
                }
    
                try {
                    const editionsFolders = await fs.readdir(editionsPath);
    
                    for (const editionFolder of editionsFolders) {
                        const subFolderPath = path.join(editionsPath, editionFolder);
                        const indexPath = path.join(subFolderPath, 'index.json');
                
                        if (!existsSync(indexPath)) {
                            console.log(`Skipping ${editionFolder} as 'index.json' file not found.`);
                            continue;
                        }
                
                        try {
                            const editionData = await fs.readFile(indexPath, 'utf8');
    
                            try {
                                const edition = JSON.parse(editionData);
                                const packetsFilePath = path.join(subFolderPath, packetsFolderName);
                                const { name, slug: editionSlug, date } = edition;
                                
                                if (!existsSync(packetsFilePath)) {
                                    console.log(`Skipping ${subFolder} as ${packetsFilePath} folder not found.`);
                                    continue;
                                }
    
                                let { id: questionSetEditionId } = findQuestionSetEditionStatement.get(slug, editionSlug) || {};
                
                                if (questionSetEditionId) {
                                    if (overWrite) {
                                        deleteQuestionSetEditionStatement.run(questionSetEditionId);
                                    } else {
                                        console.log(`Skipping ${name} as edition is already in database.`);
                                        continue;                     
                                    }
                                }
    
                                questionSetEditionId = insertQuestionSetEditionStatement.run(questionSetId, name, editionSlug, date).lastInsertRowid;
                
                                try {
                                    const packetFiles = await fs.readdir(packetsFilePath);
    
                                    for (const packetFile of packetFiles) {
                                        const gameFilePath = path.join(packetsFilePath, packetFile);
                                        const packetName = packetFile.replace('.json', '');
                
                                        try {
                                            const packetDataContent = await fs.readFile(gameFilePath);
                                            const packetData = JSON.parse(packetDataContent);
                                            const { lastInsertRowid: packetId } = insertPacketStatement.run(questionSetEditionId, packetName);
            
                                            packetData.tossups.forEach(({ question, answer, answer_sanitized, metadata }, index) => {
                                                const { author, category, subcategory, subsubcategory, editor } = parseMetadata(metadata, questionSet.metadataStyle);
                                                const sanitizedAnswer = answer_sanitized ?? removeTags(answer);
                                                
                                                insertTossup(
                                                    packetId, 
                                                    index + 1, 
                                                    question, 
                                                    answer,
                                                    sanitizedAnswer,
                                                    slugify(shortenAnswerline(removeTags(answer)).slice(0, 50), slugifyOptions), 
                                                    metadata, 
                                                    author, 
                                                    editor, 
                                                    category, 
                                                    subcategory, 
                                                    subsubcategory,
                                                    slugDictionary
                                                );
                                            });
            
                                            packetData.bonuses?.forEach(({ leadin, leadin_sanitized, metadata, answers, answers_sanitized, parts, parts_sanitized, values, difficultyModifiers }, index) => {
                                                const { author, category, subcategory, subsubcategory, editor } = parseMetadata(metadata, questionSet.metadataStyle);
    
                                                insertBonus(
                                                    packetId,
                                                    index + 1,
                                                    leadin,
                                                    leadin_sanitized,
                                                    slugify((answers_sanitized || answers).map(a => shortenAnswerline(removeTags(a)).slice(0, 25)).join(' '), slugifyOptions),
                                                    metadata,
                                                    author,
                                                    editor,
                                                    category,
                                                    subcategory,
                                                    subsubcategory,
                                                    answers, 
                                                    answers_sanitized,
                                                    parts, 
                                                    parts_sanitized, 
                                                    values, 
                                                    difficultyModifiers,
                                                    slugDictionary
                                                );
                                            });
                                        } catch (err) {
                                            console.error(`Error processing ${gameFilePath}: `, err);
                                        }
                                    }
                                } catch (err) {
                                    console.error(`Error reading files in ${packetsFilePath}: `, err);
                                }
                            } catch (err) {
                                console.error(`Error creating set edition at ${indexPath}: `, err)
                            }
                        } catch (err) {
                            console.error(`Error reading ${indexPath}:`, err);
                        }
                    }                    
                } catch(err) {
                    console.error('Error reading editions folder: ', err);
                }
            } catch {
                console.error(`Error reading ${indexPath}: `, err);
            }
        }
    } catch (err) {
        console.error('Error reading question sets folder: ', err);
    }
}

migrateQuestionSets();