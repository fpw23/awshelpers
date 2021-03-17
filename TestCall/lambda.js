
exports.handler = async function (event, context) {
    try {
        console.log(event)
        context.succeed('Test Call Complete')
    } catch (error) {
        console.log(error)
        context.fail()
    }
};