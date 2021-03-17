const { LambdaClient, PublishVersionCommand, GetFunctionConfigurationCommand } = require("@aws-sdk/client-lambda");
const { CodePipelineClient, PutJobFailureResultCommand, PutJobSuccessResultCommand  } = require("@aws-sdk/client-codepipeline");
const qs = require('querystring')

const lcclient = new LambdaClient({ region: process.env.AWS_REGION || 'us-east-2' });
const cpclient = new CodePipelineClient({ region: process.env.AWS_REGION || 'us-east-2' })

const sleep = (waitTimeInMs) => new Promise(resolve => setTimeout(resolve, waitTimeInMs))

exports.handler = async function (event, context) {
    if (event["CodePipeline.job"]) {
        await PipelineSource(event, context)
    } else {
        await BasicSource(event, context)
    } 
};

async function BasicSource (event, context) {
    try {
        await lcclient.send(new PublishVersionCommand({
            Description: event.VersionDescription,
            FunctionName: event.FunctionName
        }))
        context.succeed()
    } catch (error) {
        context.fail(error)
    }
}

async function PipelineSource (event, context) {
    try {
        // Retrieve the Job ID from the Lambda action
        var jobId = event["CodePipeline.job"].id;
        
        // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
        // health checked by this function.
        var jobParams = qs.parse(event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters); 

        var maxTires = 10
        var tryWaitTime = 4000

        for (var x = 1; x <= maxTires; x++) {
            let currentConfig = await lcclient.send(new GetFunctionConfigurationCommand({
                FunctionName: jobParams.FunctionName,
                Qualifier: 'green' // the alias to use
            }))
            if (currentConfig.State === 'Active') {
                await lcclient.send(new PublishVersionCommand({
                    FunctionName: jobParams.FunctionName,
                    Description: jobParams.Description
                }));
        
                //it's good, try to update the pipeline with success
                await cpclient.send(new PutJobSuccessResultCommand({
                    jobId: jobId
                }))
        
                //let lambda know we are good
                context.succeed()
                break
            }
            sleep(tryWaitTime)
        }
        // never went active, let the caller know we failed
        await (cpclient.send(new PutJobFailureResultCommand({
            jobId: jobId,
            failureDetails: {
                message: 'Waited for 40 secs but the function never went Actvie',
                type: 'JobFailed',
                externalExecutionId: context.awsRequestId
            }
        })))
        context.fail('Waited for 40 secs but the function never went Actvie')
    } catch (error) {
        await (cpclient.send(new PutJobFailureResultCommand({
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(error.message),
                type: 'JobFailed',
                externalExecutionId: context.awsRequestId
            }
        })))
        context.fail(error)
    }
}