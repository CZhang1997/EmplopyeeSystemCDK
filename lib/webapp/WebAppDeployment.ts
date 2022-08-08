import { CfnOutput, Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { CloudFrontWebDistribution } from "aws-cdk-lib/aws-cloudfront";
import { join } from "path";
import { SERVICE_NAME } from "../constant";

export class WebAppDeployment {
  private stack: Stack;
  private bucketSuffix: string;
  private deploymentBucket: Bucket;

  constructor(stack: Stack, bucketSuffix: string) {
    this.stack = stack;
    this.bucketSuffix = bucketSuffix;
    this.initialize();
  }

  private initialize() {
    const bucketName = `${SERVICE_NAME}-app-web` + this.bucketSuffix;
    this.deploymentBucket = new Bucket(
      this.stack,
      `${SERVICE_NAME}-app-web-id`,
      {
        bucketName: bucketName,
        publicReadAccess: true,
        websiteIndexDocument: "index.html",
      }
    );
    new BucketDeployment(this.stack, `${SERVICE_NAME}-app-web-id-deployment`, {
      destinationBucket: this.deploymentBucket,
      sources: [
        Source.asset(
          join(__dirname, "..", "..", "..", `${SERVICE_NAME}-ui`, "build")
        ),
      ],
    });
    new CfnOutput(this.stack, `${SERVICE_NAME}FinderWebAppS3Url`, {
      value: this.deploymentBucket.bucketWebsiteUrl,
    });

    const cloudFront = new CloudFrontWebDistribution(
      this.stack,
      `${SERVICE_NAME}-app-web-distribution`,
      {
        originConfigs: [
          {
            behaviors: [
              {
                isDefaultBehavior: true,
              },
            ],
            s3OriginSource: {
              s3BucketSource: this.deploymentBucket,
            },
          },
        ],
      }
    );
    new CfnOutput(this.stack, "fotoramaFinderWebAppCloudFrontUrl", {
      value: cloudFront.distributionDomainName,
    });
  }
}
