import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { Bucket } from "aws-cdk-lib/aws-s3";

export class Policies {
  private profilePhotosBucket: Bucket;
  public uploadProfilePhoto: PolicyStatement;

  constructor(profilePhotosBucket: Bucket) {
    this.profilePhotosBucket = profilePhotosBucket;
    this.initialize();
  }

  private initialize() {
    this.uploadProfilePhoto = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["s3:PutObject", "s3:PutObjectAcl"],
      resources: [this.profilePhotosBucket.bucketArn + "/*"],
    });
  }
}
