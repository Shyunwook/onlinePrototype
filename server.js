const express = require("express");
const app = express();
const child_process = require("child_process");
const bodyParser = require("body-parser");
const fs = require("fs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const multer = require("multer"); // multer모듈 적용 (for 파일업로드)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // cb 콜백함수를 통해 전송된 파일 저장 디렉토리 설정
  },
  filename: function (req, file, cb) {
    let type = req.body.type;
    let extentsion;
    if (type === "javascript") {
      extentsion = "js";
    } else if (type === "python") {
      extentsion = "py";
    } else if (type === "r") {
      extentsion = "R";
    }
    cb(null, `${file.originalname}.${extentsion}`); // cb 콜백함수를 통해 전송된 파일 이름 설정
  },
});
const upload = multer({ storage: storage });

const { NodeVM } = require("vm2");
const vm = new NodeVM({
  require: {
    external: true,
    builtin: ["child_process"],
    root: "./",
  },
});

const PORT = 3030;

app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index");
});

// vm2 사용
app.post("/upload", upload.single("userfile"), async function (req, res) {
  let type = req.body.type;
  let cmd;
  if (type === "javascript") {
    cmd = "node";
  } else if (type === "python") {
    cmd = "python";
  } else if (type === "r") {
    cmd = "Rscript";
  }
  console.log(cmd);
  try {
    let functionWithCallbackInSandbox = vm.run(`
  const child_process = require('child_process')
  module.exports = async function (cmd, callback) { 
    let process = await child_process.execSync("${cmd} ${req.file.path}");
    callback(process); 
  }
  `);

    functionWithCallbackInSandbox(cmd, async (greeting) => {
      console.log(greeting);
      await fs.unlinkSync(req.file.path);
      res.status(200).send(greeting.toString());
    });
  } catch (error) {
    console.log(error);
    res.status(400);
  }
});

// 기본 child_process
// app.post("/upload", upload.single("userfile"), async function (req, res) {
//   let type = req.body.type;
//   let cmd;
//   if (type === "javascript") {
//     cmd = "node";
//   } else if (type === "python") {
//     cmd = "python";
//   } else if (type === "r") {
//     cmd = "Rscript";
//   }
//   let process = await child_process.execSync(`${cmd} ${req.file.path}`);
//   await fs.unlinkSync(req.file.path);
//   res.send(process.toString());
// });

app.listen(PORT, () => {
  console.log(`app is running on ${PORT}...`);
});
