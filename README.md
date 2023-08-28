# Buzzpoint Migrator

This tool ingests MODAQ packet and game files into a sqlite database.

## Getting Started
1. Clone this repo and run `npm install` in the root directory
2. Create a directory called *data* in the root directory of the project. Inside *data*, create folders called *question_sets* and *tournaments*
3. In *question_sets*, add folders for each of the question sets you'd like to add to the database. In each question set folder, add an *index.json* file with properties `name`, `slug`, and `difficulty`, e.g.:
```json
{
    "name": "2023 Chicago Open",
    "slug": "2023-chicago-open",
    "difficulty": "Open",
    "metadata_regex": "(.+?), (.+)" 
}
```
4. Then, in each question set folder, add a folder called *packet_files* and insert the MODAQ packet json files for that question set.
5. In your *data/tournaments* folder, add folders for each of the tournaments that you'd like to add to the database. In each tournament folder, add an *index.json* file in the following format:
```json
{
    "name": "2023 Chicago Open",
    "slug": "2023-chicago-open",
    "set": "2023 Chicago Open",
    "location": "Northwestern University",
    "level": "Open",
    "start_date": "2023-08-05",
    "end_date": "2023-08-05",
    "rounds_to_exclude_from_individual_stats": [
        16,
        17
    ]
}
```
5. Then, in each tournament folder, add a folder called *game_files* and insert the qbj files. Each files name should start with the round number then an underscore, e.g. *1_Team_One_Team_Two.qbj*
6. After you've added all the files you'd like to import, run `npm run initDB` to populate the database.