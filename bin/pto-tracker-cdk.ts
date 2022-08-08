#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { PtoTrackerCdkStack } from "../lib/pto-tracker-cdk-stack";

const app = new cdk.App();
new PtoTrackerCdkStack(app, "PtoTrackerCdkStack", {});
