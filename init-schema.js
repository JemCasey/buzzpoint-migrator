const Database = require('better-sqlite3');

// Create or open the SQLite database file
const db = new Database('database.db');

// Create the question_set table
db.exec(`
  CREATE TABLE IF NOT EXISTS question_set (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    slug TEXT,
    difficulty TEXT
  )
`);

// Create the question_set_edition table
db.exec(`
  CREATE TABLE IF NOT EXISTS question_set_edition (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_set_id INTEGER,
    name TEXT,
    slug TEXT,
    date DATE,
    FOREIGN KEY (question_set_id) REFERENCES question_set (id) ON DELETE CASCADE
  )
`);

// Create the packet table
db.exec(`
  CREATE TABLE IF NOT EXISTS packet (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_set_edition_id INTEGER,
    name TEXT,
    FOREIGN KEY (question_set_edition_id) REFERENCES question_set_edition (id) ON DELETE CASCADE
  )
`);

// Create the packet_question table
db.exec(`
  CREATE TABLE IF NOT EXISTS packet_question (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    packet_id INTEGER,
    question_number INTEGER,
    question_id INTEGER,
    FOREIGN KEY (packet_id) REFERENCES packet (id) ON DELETE CASCADE
    FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE
  )
`);

// Create the question table
db.exec(`
  CREATE TABLE IF NOT EXISTS question (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT,
    metadata TEXT,
    author TEXT,
    editor TEXT,
    category TEXT,
    category_slug TEXT,
    subcategory TEXT,
    subcategory_slug TEXT,
    subsubcategory TEXT,
    category_main TEXT GENERATED ALWAYS AS (case when category = subcategory then category else (category || ' - ' || subcategory) end),
    category_main_slug TEXT GENERATED ALWAYS AS (case when category_slug = subcategory_slug then category_slug else (category_slug || '-' || subcategory_slug) end),
    category_full TEXT GENERATED ALWAYS AS (case when subcategory is null then category else (category || ' - ' || subcategory || case when subsubcategory is null then '' else (' - ' || subsubcategory) end) end) STORED
  )
`);

// creates tossup hash table
db.exec(`
  CREATE TABLE IF NOT EXISTS tossup_hash (
    hash TEXT PRIMARY KEY,
    question_id INT,
    tossup_id INT,
    FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE,
    FOREIGN KEY (tossup_id) REFERENCES tossup (id) ON DELETE CASCADE
  )
`);

// creates bonus hash table
db.exec(`
  CREATE TABLE IF NOT EXISTS bonus_hash (
    hash TEXT PRIMARY KEY,
    question_id INT,
    bonus_id INT,
    FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE,
    FOREIGN KEY (bonus_id) REFERENCES bonus (id) ON DELETE CASCADE
  )
`);

// Create the tossup table
db.exec(`
  CREATE TABLE IF NOT EXISTS tossup (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INT,
    question TEXT,
    answer TEXT,
    FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE
  )
`);

// Create the bonus table
db.exec(`
  CREATE TABLE IF NOT EXISTS bonus (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question_id INT,
    leadin TEXT,
    leadin_sanitized TEXT,
    FOREIGN KEY (question_id) REFERENCES question (id) ON DELETE CASCADE
  )
`);

// Create the bonus_part table
db.exec(`
  CREATE TABLE IF NOT EXISTS bonus_part (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number INTEGER,
    bonus_id INTEGER,
    part TEXT,
    part_sanitized TEXT,
    answer TEXT,
    answer_sanitized TEXT,
    value INTEGER,
    difficulty_modifier TEXT,
    FOREIGN KEY (bonus_id) REFERENCES bonus (id) ON DELETE CASCADE
  )
`);

// Create the tournament table
db.exec(`
  CREATE TABLE IF NOT EXISTS tournament (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    slug TEXT,
    question_set_edition_id INTEGER,
    location TEXT,
    level TEXT,
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (question_set_edition_id) REFERENCES question_set_edition (id) ON DELETE CASCADE
  )
`);

// Create the round table
db.exec(`
  CREATE TABLE IF NOT EXISTS round (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    number INTEGER,
    packet_id INTEGER,
    exclude_from_individual BIT DEFAULT 0,
    FOREIGN KEY (tournament_id) REFERENCES tournament (id) ON DELETE CASCADE,
    FOREIGN KEY (packet_id) REFERENCES packet (id) ON DELETE CASCADE
  )
`);

// Create the team table
db.exec(`
  CREATE TABLE IF NOT EXISTS team (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER,
    name TEXT,
    slug TEXT,
    FOREIGN KEY (tournament_id) REFERENCES tournament (id) ON DELETE CASCADE
  )
`);

// Create the player table
db.exec(`
  CREATE TABLE IF NOT EXISTS player (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    name TEXT,
    slug TEXT,
    FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE
  )
`);

// Create the game table
db.exec(`
  CREATE TABLE IF NOT EXISTS game (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    round_id INTEGER,
    tossups_read INTEGER,
    team_one_id INTEGER,
    team_two_id INTEGER,
    FOREIGN KEY (round_id) REFERENCES round (id) ON DELETE CASCADE,
    FOREIGN KEY (team_one_id) REFERENCES team (id) ON DELETE CASCADE,
    FOREIGN KEY (team_two_id) REFERENCES team (id) ON DELETE CASCADE
  )
`);

// Create the buzz table
db.exec(`
  CREATE TABLE IF NOT EXISTS buzz (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER,
    game_id INTEGER,
    tossup_id INTEGER,
    buzz_position INTEGER,
    value INTEGER,
    FOREIGN KEY (player_id) REFERENCES player (id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES game (id) ON DELETE CASCADE,
    FOREIGN KEY (tossup_id) REFERENCES tossup (id) ON DELETE CASCADE
  )
`);

// Create the bonus_part_direct table
db.exec(`
  CREATE TABLE IF NOT EXISTS bonus_part_direct (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER,
    game_id INTEGER,
    bonus_part_id INTEGER,
    value INTEGER,
    FOREIGN KEY (team_id) REFERENCES team (id) ON DELETE CASCADE,
    FOREIGN KEY (game_id) REFERENCES game (id) ON DELETE CASCADE,
    FOREIGN KEY (bonus_part_id) REFERENCES bonus_part (id) ON DELETE CASCADE
  )
`);