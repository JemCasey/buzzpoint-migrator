const subcategoryMap = require("./subcat-to-cat.json");

const metadataTypes = {
    justSubcategory: 1,
    authorAndSubsubcategory: 2,
    nscStyle: 3,
    nasatStyle: 4,
    qbreaderStyle: 5,
    authorAndSubcategory: 6,
}

const parseMetadata = (metadata, metadataType) => {
    let category, subcategory, subsubcategory, author, editor;

    if (metadata) {
        if (metadataType === metadataTypes.justSubcategory) {
            subcategory = metadata;
            category = subcategoryMap[subcategory] || subcategory;
        } else if (metadataType === metadataTypes.authorAndSubsubcategory) {
            const regex = new RegExp(/(.*?), (.*)/);
            const metadataMatch = metadata?.match(regex) || [];
            const rawCategory = metadataMatch[2];

            author = metadataMatch[1];
            [subcategory, subsubcategory] = (rawCategory || '').split(' - ');
            category = subcategoryMap[subcategory] || subcategory;
        } else if (metadataType === metadataTypes.nscStyle) {
            const regex = new RegExp(/(.+?), (.*)&gt;.*Editor: (.*)/);
            const metadataMatch = metadata?.match(regex) || [];
            const rawCategory = metadataMatch[2];

            author = metadataMatch[1];
            editor = metadataMatch[3];
            [category, subcategory, subsubcategory] = (rawCategory || '').split(' - ');
        } else if (metadataType === metadataTypes.nasatStyle) {
            const regex = new RegExp(/(.+?) , (.*)/);
            const metadataMatch = metadata?.match(regex) || [];
            const rawCategory = metadataMatch[2];

            author = metadataMatch[1];
            [category, subcategory, subsubcategory] = (rawCategory || '').split(' - ');
        } else if (metadataType === metadataTypes.qbreaderStyle) {
            const metadataMatch = metadata.split(' - ');
            category = metadataMatch[0];
            subcategory = metadataMatch[1];
            if (metadataMatch.length > 2) {
                subsubcategory = metadataMatch[2];
            }
        } else if (metadataType === metadataTypes.authorAndSubcategory) {
            const regex = new RegExp(/(.*?)[,-](.*)/);
            const metadataMatch = metadata?.match(regex) || [];
            author = metadataMatch[1]?.trim();
            subcategory = metadataMatch[2]?.trim();
            category = subcategoryMap[subcategory] || subcategory;
        }
    }

    return {
        category,
        subcategory,
        subsubcategory,
        author,
        editor
    }
}

module.exports = {
    parseMetadata
}
