# Buzzpoint Migrator

This tool ingests MODAQ packet and game files into a sqlite database.

## Getting Started
1. Clone this repo and run `npm install` in the root directory
2. Create a directory called *data* in the root directory of the project. Inside *data*, create folders called *question_sets* and *tournaments*
3. In *question_sets*, add folders for each of the question sets you'd like to add to the database. In each question set folder, add an *index.json* file with properties `name`, `slug`, `difficulty`, and `metadataStyle`, e.g.:
```json
{
    "name": "2023 Chicago Open",
    "slug": "2023-chicago-open",
    "difficulty": "Open",
    "metadataStyle": 2
}
```
4. `metadataStyle` is required if you'd like the `questions` table to populate with category and author data. Please refer to *metadataUtils.js* to see which `metadataStyle` value fits your set and modify the code as needed if none do.
5. In each subfolder of *question sets*, add a folder called *editions*. *Editions* should have subfolders for each of the versions of the question set. For instance, if 2023 Chicago Open has an edition that was played on 08/05/2023, create a subfolder in *editions* called *2023-08-05*. Each editions subfolder should have an *index.json* file with properties `name`, `slug`, and `date`, e.g.:
```json
{
    "name": "08/05/2023",
    "slug": "2023-08-05",
    "date": "2023-08-05"
}
```
6. In each subfolder of *editions*, add a *packet_files* subfolder containing the MODAQ packet json files for that version of the question set.
7. In your *data/tournaments* folder, add folders for each of the tournaments that you'd like to add to the database. In each tournament folder, add an *index.json* file in the following format:
```json
{
    "name": "2023 Chicago Open",
    "slug": "2023-chicago-open",
    "set": "2023 Chicago Open",
    "edition": "08/05/2023",
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
8. Then, in each tournament folder, add a folder called *game_files* and insert the qbj files. Each files name should start with the string "Round_", then the round number, then an underscore, e.g. *Round_1_Team_One_Team_Two.qbj*
9. Your data subfolder should now be structured like this:
```
.
|-- question_sets
|   |-- 2023_Chicago_Open
|   |   `-- editions
|   |       `-- 2023-08-05
|   |           `-- packet_files
|   |           `-- index.json
|   |   `-- index.json
`-- tournaments
    |-- 2023_Chicago_Open
    |   `-- game_files
    |   `-- index.json
```
10. After you've added all the files you'd like to import, run `npm run initDB` to populate the database.

## Credits
Thanks to Anderson Wang and Geoffrey Wu for their feedback on the tool, and to Geoffrey for letting me steal [*subcat-to-cat.json* from his packet parser](https://github.com/qbreader/packet-parser/blob/main/modules/subcat-to-cat.json).