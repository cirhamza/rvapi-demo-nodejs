//Imports //
let fs = require("fs");
let request = require("request-promise");
let { DOWNLOADS_FOLDER, TOKEN_PATH } = require("./configs");
require("dotenv").config();

//Global Variables
const baseUrl = process.env.API_LINK;

//The HTTP Request functions: all these functions accept at most one parameter:
//      either the formData object which contains the file to slice and its configurations, or the uniqueID of the slicing job.
//      or no parameter at all in GetActivationStatus's case

GetActivationStatus = async () => {
	let formData = {};
	return await initializeRequest(
		"POST",
		baseUrl,
		"GetActivationStatus",
		formData
	);
};

UploadFile = async (filename, filePath) => {
	const formData = {
		// Pass data via Streams
		filename: filename,
		file: fs.createReadStream(filePath)
	};
	const result = await initializeRequest(
		"POST",
		baseUrl,
		"UploadFile",
		formData
	);

	return result.fileId;
};

StartSlicingTask = async formData => {
	const result = await initializeRequest(
		"POST",
		baseUrl,
		"StartSlicingTask",
		formData
	);
	return result.taskId;
};

GetProgress = async id => {
	const formData = { taskId: id };
	const result = await initializeRequest(
		"POST",
		baseUrl,
		"GetProgress",
		formData
	);
	return result.progress;
};

GetPrintingInformation = async id => {
	const formData = { taskId: id };
	const result = await initializeRequest(
		"POST",
		baseUrl,
		"GetPrintingInformation",
		formData
	);

	return result;
};

CancelSlicing = async id => {
	const formData = { taskId: id };
	const result = await initializeRequest(
		"POST",
		baseUrl,
		"CancelSlicing",
		formData
	);
	return result;
};

DownloadFile = async id => {
	const formData = { taskId: id };
	return await initializeRequest("POST", baseUrl, "DownloadFile", formData);
};

//This functions saves the file in the downloads folder.
//It is used right after the the DownlaodFile function is executed and returns the response

saveFile = (filename, fileExt, result) => {
	const fullname = filename + "." + Date.now() + "." + fileExt;

	if (!fs.existsSync(DOWNLOADS_FOLDER)) {
		fs.mkdirSync(DOWNLOADS_FOLDER);
	}
	const file = fs.createWriteStream(DOWNLOADS_FOLDER + fullname);
	file.write(result);
	file.end();
	console.log(
		"   File saved successfully in the Downloads folder under the name ::::: ",
		fullname
	);
};

//Check if we have a token file or not, if we do, check if it's valid or not
isTokenValid = () => {
	let token = {};

	try {
		token = require("./token.json");
	} catch {
		console.log(
			"Error retrieving token from : " +
				TOKEN_PATH +
				", please wait while we get a new token."
		);
		return false;
	}

	if (token.expires_on == "") {
		console.log(
			"Error while retrieving token expiry date from : " + TOKEN_PATH
		);
		return false;
	} else if (Date.now() / 1000 < token.expires_on) {
		return true;
	}

	return false;
};

//Get token first

getToken = async () => {
	const formData = {
		grant_type: "client_credentials",
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
		resource: "https://api.createitreal.com/"
	};

	const options = {
		method: "POST",
		uri: process.env.AUTHORIZATION_SERVER_URL,
		formData: formData
	};

	const writeFile = (path, data, opts = "utf8") =>
		new Promise((resolve, reject) => {
			fs.writeFile(path, data, opts, err => {
				if (err) reject(err);
				else resolve();
			});
		});

	if (isTokenValid()) {
		const token = require(TOKEN_PATH);
		return token;
	} else {
		return await request(options)
			.then(result => {
				writeFile(TOKEN_PATH, result, () => {
					console.log("TOKEN SUCCESSFULLY SAVED");
				});
				return JSON.parse(result);
			})
			.catch(err => {
				let error = JSON.parse(err.error);
				console.error(
					" ************************************************************************************** "
				);
				console.error("Error while fetching new token.");
				console.error("Reason : ", error.error);
				console.error(
					" ************************************************************************************** "
				);
				return err;
			});
	}
};

//This is the function you call in order to execute the HTTP requests,
//all the functions above use this function.
initializeRequest = async (method, baseUrl, serviceCall, formData) => {
	//Getting token
	// let TOKEN = await getToken();
	// if (!TOKEN.access_token) {
	// 	throw Error();
	// }
	//let TOKEN = "";

	//Since DownlodFile doesn't accept JSON, we send the taskId in the URL and not the body of the request.
	let url =
		serviceCall !== "DownloadFile"
			? baseUrl + "/" + serviceCall
			: baseUrl + "/" + "DownloadFile?taskId=" + formData.taskId;
	//IF servicecall is downloadfile
	let filename = "";
	let fileExt = "";

	let options = {
		method: method,
		uri: url,
		followAllRedirects: true,
		headers: {
			"Ocp-Apim-Subscription-Key": process.env.SUBSCRIPTION_KEY
			//Authorization: "Bearer " + TOKEN
		},
		resolveWithFullResponse: true,
		json: true
	};

	if (serviceCall == "UploadFile") {
		options.headers["Content-Type"] = "multipart/form-data";
		options["formData"] = formData;
	} else {
		options.headers["Content-Type"] = "application/json";
		options["body"] = formData;
	}

	// Return new promise
	return request(options)
		.then(resp => {
			if (serviceCall == "DownloadFile") {
				const contentDisposition = resp.headers["content-disposition"];
				if (
					contentDisposition &&
					contentDisposition.indexOf("attachment") !== -1
				) {
					var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
					var matches = filenameRegex.exec(contentDisposition);
					if (matches != null && matches[1]) {
						result = matches[1].replace(/['"]/g, "");
						fullname = result.split(".", 2);
						filename = fullname[0];
						fileExt = fullname[1];
					}
				}
				return resp.body;
			} else {
				return resp.body;
			}
		})
		.catch(resp => {
			console.log(
				" ************************************************************************************** "
			);
			console.error("ERROR WHILE MAKING REQUEST :::::: ");
			if (resp.statusCode && resp.statusCode == 400) {
				console.error(
					"Something missing or wrong with the request itself:",
					resp.error.error.details
				);
			} else if (resp.error && resp.statusCode == 404) {
				console.error(resp.error.error.errorMessage);
			} else if (
				resp.statusCode &&
				!resp.error &&
				resp.statusCode == 404
			) {
				console.error(
					"The link you're trying to call doesn't exist, for more details, the error message is: ",
					resp.message
				);
			} else {
				console.error(resp.Error);
			}
			console.log(
				" ************************************************************************************** "
			);
			return resp;
		})
		.then(resp => {
			console.log(
				" ************************************************************************************** "
			);
			console.log("   Full URL        ::::: " + options.uri);
			console.log("   NEW TOKEN?      ::::: " + !isTokenValid());
			if (serviceCall !== "DownloadFile") {
				console.log(
					"   Status code of  ::::: " +
						serviceCall +
						"   ::::: is ::::: ",
					resp.result ? "200" : resp.error.statusCode
				);
				console.log(
					"   Status Description of ::::: " +
						serviceCall +
						"   ::::: is ::::: ",
					resp.result ? "OK" : resp.error.statusDescription
				);
				console.log(
					"   Result of       ::::: " +
						serviceCall +
						"   ::::: is ::::: ",
					resp.result ? resp.result : resp.error.error
				);
			} else {
				resp.error ? "" : saveFile(filename, fileExt, resp);
				console.log(
					"   Status code of  ::::: " +
						serviceCall +
						"   ::::: is ::::: ",
					resp.error ? resp.error.statusCode : "200"
				);
				console.log(
					"   Status Description of ::::: " +
						serviceCall +
						"   ::::: is ::::: ",
					resp.error ? resp.error.statusDescription : "OK"
				);
				console.log(
					"   Result of       ::::: " +
						serviceCall +
						"   ::::: is ::::: ",
					resp.error
						? resp.error.error
						: "Please check your downloads folder ... "
				);
			}

			console.log(
				" ************************************************************************************** "
			);

			return resp.result ? resp.result : resp;
		});
};

module.exports = {
	GetActivationStatus,
	UploadFile,
	StartSlicingTask,
	GetProgress,
	GetPrintingInformation,
	CancelSlicing,
	DownloadFile
};
