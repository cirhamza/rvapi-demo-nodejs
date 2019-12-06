//project configs
const DOWNLOADS_FOLDER = __dirname + "/downloads/";
const ASSETS_FOLDER = __dirname + "/assets/";
const CHECK_PROGRESS_INTERVAL = 3000;
const TOKEN_PATH = __dirname + "/token.json";

const configs = {
	CHECK_PROGRESS_INTERVAL,
	ASSETS_FOLDER,
	DOWNLOADS_FOLDER,
	TOKEN_PATH
};

module.exports = configs;
