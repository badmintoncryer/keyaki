import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'node:path';
import * as assets from 'aws-cdk-lib/aws-ecr-assets';

const USER_ID = process.env.KEYAKI_USER_ID;
const PASSWORD = process.env.KEYAKI_PASSWORD;

if (!USER_ID || !PASSWORD) {
  throw new Error(
    `環境変数が設定されていません。 USER_ID: ${USER_ID}, PASSWORD: ${PASSWORD}`
  );
}

export class KeyakiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const topic = new sns.Topic(this, 'KeyakiTopic', {
      displayName: 'Keyaki Koryaku System',
    });
    topic.addSubscription(new subscriptions.EmailSubscription('malaysia.cryer@gmail.com'));

    const searchHandler = new lambda.DockerImageFunction(this, 'SearchHandler', {
      code: lambda.DockerImageCode.fromImageAsset(path.join(__dirname, '../../lambda/searchVacantGym'), {
        platform: assets.Platform.LINUX_AMD64,
      }),
      memorySize: 2048,
      timeout: cdk.Duration.minutes(1),
      architecture: lambda.Architecture.X86_64,
      environment: {
        KEYAKI_USER_ID: USER_ID ?? '',
        KEYAKI_PASSWORD: PASSWORD ?? '',
        TOPIC_ARN: topic.topicArn,
      },
    });
    topic.grantPublish(searchHandler);
  }
}
