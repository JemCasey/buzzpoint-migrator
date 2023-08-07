exports.slugify = (text) => text.replace(/\W+/g, '-').toLowerCase().trim();
exports.sanitize = (text) => text.replace(/ *\([^)]*\)/g, "").trim();
exports.shortenAnswerline = (answerline) => answerline.split("[")[0].replace(/ *\([^)]*\)/g, "").trim();
exports.removeTags = (text) => text.replace( /(<([^>]+)>)/ig, '');
exports.slugifyOptions = {
    lower: true,
    strict: true
}