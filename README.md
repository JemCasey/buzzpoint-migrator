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

```