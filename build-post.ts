import * as fs from "fs-extra";

async function postBuild() {
  try {
    await fs.copy("./src/typings.d.ts", "./dist/typings.d.ts");
    console.log("Copied src/typings.d.ts to dist/typings.d.ts");
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

postBuild();
