
exports.handler = function main(event, context) {
    // Fail on mising data
    if (!destBucket || !blurRadius) {
        context.fail('Error: Environment variable DEST_BUCKET missing');
        return;
    }
    if (event.Records === null) {
        context.fail('Error: Event has no records.');
        return;
    }
}