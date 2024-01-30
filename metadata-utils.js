const subcategoryMap = require("./subcat-to-cat.json");

const metadataTypes = {
    justSubcategory: 1,
    authorAndSubcategory: 2,
    nscStyle: 3,
    nasatStyle: 4
}

const parseMetadata = (metadata, metadataType) => {
    let category, subcategory, subsubcategory, author, editor;

    if (metadata) {
        if (metadataType === metadataTypes.justSubcategory) {
            subcategory = metadata;
            category = subcategoryMap[subcategory] || subcategory;
        } else if (metadataType === metadataTypes.authorAndSubcategory) {
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