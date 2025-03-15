exports.slugify = (text) => text.replace(/\W+/g, "-").toLowerCase().trim();
exports.sanitize = (text) => text.replace(/ *\([^)]*\)/g, "").trim();
exports.shortenAnswerline = (answerline) => answerline.split("[")[0].replace(/ *\([^)]*\)/g, "").replaceAll(/\&nbsp;/g, " ").replaceAll(/\&amp;/g, "\&").trim();
exports.removeTags = (text) => text.replace(/(<([^>]+)>)/ig, "").replaceAll(/\&nbsp;/g, " ").replaceAll(/\&amp;/g, "\&");
exports.slugifyOptions = {
    lower: true,
    strict: true
}
