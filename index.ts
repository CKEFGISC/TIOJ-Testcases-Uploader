import * as fs from "node:fs";
import axios, { AxiosInstance } from "axios";
import { wrapper as axiosCookieJarWrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";
import * as cheerio from "cheerio";
import * as streamToBlob from "stream-to-blob";
import * as YAML from "yaml";

let config = YAML.parse((fs.readFileSync("./config.yml")).toString()) as {
  tioj: {
    domain: string,
    username: string,
    password: string
  },
  problems: Array<number>,
  folder: string
};

let axiosClient: AxiosInstance;

function generateFormDataFromObject(object: object) {
  return Object.keys(object).reduce((formData, key) => {
    formData.append(key, object[key]);
    return formData;
  }, new FormData());
};

async function signIn() {
  console.log("Logging in, getting log-in page auth-token");
  const getPage = await axiosClient.get(`${config.tioj.domain}/users/sign_in/`);

  var $ = cheerio.load(getPage.data);

  const authToken = $("input[name='authenticity_token']").attr("value");
  console.log("Got auth-token, posting log-in data");

  const postPage = await axiosClient.post(
    `${config.tioj.domain}/users/sign_in/`,
    generateFormDataFromObject({
      "authenticity_token": authToken,
      "user[username]": config.tioj.username,
      "user[password]": config.tioj.password,
      "user[remember_me]": "1",
      "commit": "Sign in"
    }),
    {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    }
  );

  var $ = cheerio.load(postPage.data);

  if ($("div[role='alert'] > strong").last().text().trim() !== "Oh Geez!") {
    await fs.promises.writeFile("./error.log", postPage.data);
    throw new Error(`Failed to log in as ${process.env.TIOJ_USERNAME}`);
  }

  console.log(`Logged in as ${process.env.TIOJ_USERNAME}`);
}

async function postTestcases(id: number) {
  var getPage = await axiosClient.get(`${config.tioj.domain}/problems/${id}/testdata/new`);

  var $ = cheerio.load(getPage.data);

  const authToken = $("input[name='authenticity_token']").attr("value");
  console.log("Got auth-token, generating testcases");

  let folderPath = eval(config.folder);
  for (let i = 0; fs.existsSync(folderPath + i + ".in"); ++i) {
    const fileIn  = fs.createReadStream(folderPath + i + ".in");
    const fileOut = fs.createReadStream(folderPath + i + ".out");

    let formDataToAddTestcase = generateFormDataFromObject({
      "authenticity_token": authToken,
      "testdatum[time_limit]": 1000,
      "testdatum[vss_limit]": 65536,
      "testdatum[rss_limit]": 65536,
      "testdatum[output_limit]": "65536",
      "testdatum[problem_id]": id,
      "commit": "Create Testdatum",
    });

    formDataToAddTestcase.append(
      "testdatum[test_input]",
      await streamToBlob(fileIn, "text/plain"),
      `${i}.in`
    );
    formDataToAddTestcase.append(
      "testdatum[test_output]",
      await streamToBlob(fileOut, "text/plain"),
      `${i}.out`
    );

    axiosClient.post(`${config.tioj.domain}/problems/${id}/testdata`, formDataToAddTestcase);
    console.log(`Posted testcase #${i} for problem #${id}`);

    if (i % 5 == 0) {
      console.log("500ms cool-down...");
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function main() {
  axiosClient = axiosCookieJarWrapper(axios.create({ jar: new CookieJar() }));
  console.log("Created axios client");

  await signIn();

  for (let i of config.problems) {
    await postTestcases(i);

    console.log("1000ms cool-down...")
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("Done");
}

main();
