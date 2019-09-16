const replace = require("replace-in-file");
const options = {
  files: "./dist/index.html",
  from: [/href="(.*?)"/g, /src="(.*?)"/g],
  to: match => {
    const addParam = match.split("?").length === 1;
    if (addParam) {
      return `${match.replace(/.$/, "")}?q=${Date.now()}"`;
    } else {
      return match;
    }
  }
};
replace.sync(options);
