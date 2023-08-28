const Database = require('better-sqlite3');

// Create or open the SQLite database file
const db = new Database('database.db');
const slugify = require('slugify');

const fs = require('fs');
const path = require('path');
const { slugifyOptions } = require('./utils');

const tournamentsPath = './data/tournaments';
const gamesFolderName = 'game_files';

const insertTournamentStatement = db.prepare('INSERT INTO tournament (name, slug, question_set_id, location, level, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?, ?)');
const insertRoundStatement = db.prepare('INSERT INTO round (tournament_id, number, packet_id, exclude_from_individual) VALUES (?, ?, ?, ?)');
const insertTeamStatement = db.prepare('INSERT INTO team (tournament_id, name, slug) VALUES (?, ?, ?)');
const insertPlayerStatement = db.prepare('INSERT INTO player (team_id, name, slug) VALUES (?, ?, ?)');
const insertGameStatement = db.prepare('INSERT INTO game (round_id, tossups_read, team_one_id, team_two_id) VALUES (?, ?, ?, ?)');
const insertBuzzStatement = db.prepare('INSERT INTO buzz (player_id, game_id, tossup_id, buzz_position, value) VALUES (?, ?, ?, ?, ?)');
const insertBonusPartDirectStatement = db.prepare('INSERT INTO bonus_part_direct (team_id, game_id, bonus_part_id, value) VALUES (?, ?, ?, ?)');

const findTournamentStatement = db.prepare('SELECT id FROM tournament WHERE slug = ?');
const findQuestionSetStatement = db.prepare('SELECT id FROM question_set WHERE name = ?');
const findPacketStatement = db.prepare('SELECT id FROM packet WHERE question_set_id = ? and name = ?');
const findTossupStatement = db.prepare('SELECT id FROM tossup WHERE packet_id = ? and question_number = ?');
const findBonusPartsStatement = db.prepare('SELECT bonus_part.id, part_number FROM bonus JOIN bonus_part ON bonus.id = bonus_id WHERE packet_id = ? and question_number = ?');

fs.readdir(tournamentsPath, (err, subFolders) => {
    if (err) {
        console.error('Error reading tournaments folder: ', err);
        return;
    }

    subFolders.forEach((subFolder) => {
        const subFolderPath = path.join(tournamentsPath, subFolder);

        const indexPath = path.join(subFolderPath, 'index.json');

        if (!fs.existsSync(indexPath)) {
            console.log(`Skipping ${subFolder} as 'index.json' file not found.`);
            return;
        }

        fs.readFile(indexPath, 'utf8', (err, tournamentData) => {
            if (err) {
                console.error(`Error reading ${indexPath}:`, err);
                return;
            }

            try {
                const tournament = JSON.parse(tournamentData);
                const gamesFilePath = path.join(subFolderPath, gamesFolderName);
                const { name, slug, set, location, level, start_date, end_date, rounds_to_exclude_from_individual_stats } = tournament;
                const { id: existingTournamentId } = findTournamentStatement.get(slug) || {};

                if (!existingTournamentId) {         
                    const { id: questionSetId } = findQuestionSetStatement.get(set);
                    const roundDictionary = {};
                    const playerDictionary = {};
                    const teamDictionary = {};
                    const tossupDictionary = {};
                    const bonusDictionary = {};
                    const { lastInsertRowid: tournamentId } = insertTournamentStatement.run(name, slug, questionSetId, location, level, start_date, end_date);
    
                    if (!fs.existsSync(gamesFilePath)) {
                        console.log(`Skipping ${subFolder} as ${gamesFolderName} folder not found.`);
                        return;
                    }
    
                    fs.readdir(gamesFilePath, (err, gameFiles) => {
                        if (err) {
                            console.error(`Error reading files in ${gamesFilePath}:`, err);
                            return;
                        }
    
                        gameFiles.forEach((gameFile) => {
                            const gameFilePath = path.join(gamesFilePath, gameFile);
    
                            fs.readFile(gameFilePath, 'utf8', (err, gameDataContent) => {
                                if (err) {
                                    console.error(`Error reading ${gameFilePath}:`, err);
                                    return;
                                }
    
                                try {
                                    const roundNumber = parseInt(gameFile.split("_")[tournament.name.toLowerCase().includes("pace") ? 0 : 1]);
                                    const gameData = JSON.parse(gameDataContent);
    
                                    // update round dictionary if needed
                                    if (!roundDictionary[roundNumber]) {
                                        const { id: packetId } = findPacketStatement.get(questionSetId, gameData.packets);
                                        const { lastInsertRowid: roundId } = insertRoundStatement.run(tournamentId, roundNumber, packetId, rounds_to_exclude_from_individual_stats?.find(r => r === roundNumber) ? 1 : 0);
    
                                        roundDictionary[roundNumber] = { packetId, roundId };
                                    }
    
                                    // update team and player dictionaries if needed                                
                                    for (let { team } of gameData.match_teams) {
                                        if (!teamDictionary[team.name]) {
                                            const { lastInsertRowid: teamId } = insertTeamStatement.run(tournamentId, team.name, slugify(team.name, slugifyOptions));
    
                                            teamDictionary[team.name] = teamId;
                                        }
    
                                        for (let { name } of team.players) {
                                            let key = `${team.name}-${name}`;
    
                                            if (!playerDictionary[key]) {
                                                const { lastInsertRowid: playerId } = insertPlayerStatement.run(teamDictionary[team.name], name, slugify(team.name, slugifyOptions));
    
                                                playerDictionary[key] = playerId;
                                            }
                                        }
                                    }
    
                                    const teamOneName = gameData.match_teams[0].team.name;
                                    const teamTwoName = gameData.match_teams[1].team.name;
                                    const { lastInsertRowid: gameId } = insertGameStatement.run(roundDictionary[roundNumber].roundId, gameData.tossups_read, teamDictionary[teamOneName], teamDictionary[teamTwoName]);
    
                                    // insert buzzes and bonus data
                                    gameData.match_questions.forEach(({ buzzes, tossup_question: { question_number }, bonus }) => {
                                        let packetId = roundDictionary[roundNumber].packetId;
                                        let tossupKey = `${packetId}-${question_number}`;
                                        let bonusKey = `${packetId}-${bonus?.question.question_number}`;
    
                                        // update tossup dictionary if needed
                                        if (!tossupDictionary[tossupKey]) {
                                            let packet = findTossupStatement.get(packetId, question_number);
    
                                            if (!packet)
                                                console.log(`"${packetId}", "${question_number}"`);
                                                
                                            tossupDictionary[tossupKey] = packet.id;
                                        }
    
                                        // update bonus dictionary if needed
                                        if (bonus && !bonusDictionary[bonusKey]) {
                                            let bonusResults = findBonusPartsStatement.all(packetId, bonus.question.question_number);
                                            bonusDictionary[bonusKey] = bonusResults;
                                        }
    
                                        for (let { buzz_position, player, team, result } of buzzes) {
                                            let playerId = playerDictionary[`${team.name}-${player.name}`];
    
                                            insertBuzzStatement.run(playerId, gameId, tossupDictionary[tossupKey], buzz_position.word_index, result.value);
                                        }
    
                                        if (bonus) {
                                            let teamId = teamDictionary[buzzes.find(({ result }) => result.value > 0).team.name];
                                            let bonusParts = bonusDictionary[bonusKey];
    
                                            if (bonusParts.length) {
                                                bonus.parts.forEach((part, index) => {
                                                    insertBonusPartDirectStatement.run(teamId, gameId, bonusParts.find(p => p.part_number === index + 1).id, part.controlled_points);
                                                });
                                            }
                                        }
                                    });
                                } catch (err) {
                                    console.error(`Error occurred while parsing JSON in ${gameFilePath} and writing it to db:`, err);
                                }
                            });
                        });
                    });
                } else {
                    console.log(`Skipping ${subFolder} as tournament is already in databsae`);
                }
            } catch (err) {
                console.error(`Error parsing JSON in ${indexPath}:`, err);
            }
        });
    });
});