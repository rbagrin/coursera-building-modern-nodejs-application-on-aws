// # Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// #
// # Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except
// # in compliance with the License. A copy of the License is located at
// #
// # https://aws.amazon.com/apache-2-0/
// #
// # or in the "license" file accompanying this file. This file is distributed on an "AS IS" BASIS,
// # WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
// # specific language governing permissions and limitations under the License.

var AWS = require("aws-sdk");

const s3 = new AWS.S3({
  region: "eu-west-2",
});

const ssm = new AWS.SSM({
  region: "eu-west-2",
});

async function readDragons() {
  var fileName = await getFileName();
  var bucketName = await getBucketName();
  return readDragonsFromS3(bucketName, fileName);
}

async function getFileName() {
  var fileNameParams = {
    Name: "dragon_data_file_name",
    WithDecryption: false,
  };
  var promise = await ssm.getParameter(fileNameParams).promise();
  console.log(promise);
  return promise.Parameter.Value;
}

async function getBucketName() {
  var bucketNameParams = {
    Name: "dragon_data_bucket_name",
    WithDecryption: false,
  };

  var promise = await ssm.getParameter(bucketNameParams).promise();
  return promise.Parameter.Value;
}

function readDragonsFromS3(bucketName, fileName) {
  s3.selectObjectContent(
    {
      Bucket: bucketName,
      Expression: "select * from S3Object[*][*] s",
      ExpressionType: "SQL",
      Key: fileName,
      InputSerialization: {
        JSON: {
          Type: "DOCUMENT",
        },
      },
      OutputSerialization: {
        JSON: {
          RecordDelimiter: ",",
        },
      },
    },
    function (err, data) {
      if (err) {
        console.log(err);
      } else {
        handleData(data);
      }
    }
  );
}

function handleData(data) {
  var event = data.Payload;
  const resultStream = [];
  data.Payload.on("data", (event) => {
    if (event.Records) {
      resultStream.push(event.Records.Payload);
      console.log(event.Records.Payload.toString());
    }
  });

  event.on("end", function () {
    let recordsString = Buffer.concat(resultStream).toString("utf8");
    // remove any trailing commas
    recordsString = recordsString.replace(/\,$/, "");
    // parse as an array
    recordsString = `[${recordsString}]`;
    let records = JSON.parse(recordsString);

    console.log(JSON.stringify(records));
  });
}

readDragons();
