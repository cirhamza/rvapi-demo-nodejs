// ******************************************************************** //
// Imports
// ******************************************************************** //

let realvision = require("./Realvision");
const { CHECK_PROGRESS_INTERVAL, ASSETS_FOLDER } = require("./configs");

// ******************************************************************** //
// ******************************************************************** //

//After checking if the token is valid or not
//The executeFlow() function will execute the whole Slicing flow from checking the activation status to
//Downloading the file and saving it in the "downloads" folder.
//To execute this process, go to your command line interface and cd into this folder,
//then write: "node test.js", or you can simply execute the npm script by typing: "npm test"

Slice();

// ******************************************************************** //
// ******************************************************************** //
// **********************  Slicing Logic  ***************************** //
// ******************************************************************** //
// ******************************************************************** //

async function Slice() {
	const stlFileConfigs = require("./filesToSlice.json");

	stlFileConfigs.forEach(stlFile => {
		console.log(
			"============================================================================================"
		);
		console.log("Slicing the following stl file: ", stlFile.filename);
		console.log(
			"============================================================================================"
		);
		console.log();
		ExecuteSlicingFlow(stlFile);
	});
}

async function ExecuteSlicingFlow(stlFileConfigs) {
	//This is the data you'll be sending with the StartSlicing POST request, feel free to specifiy the configurations you deem fit.
	const ApiRequest = {
		filename: stlFileConfigs.filename,
		fileId: "",
		supportType: stlFileConfigs.supportType,
		printerModel: stlFileConfigs.printerModel,
		configPresetName: stlFileConfigs.configPresetName,
		configFile: stlFileConfigs.configFile,
		position: stlFileConfigs.position,
		rotation: stlFileConfigs.rotation,
		scale: stlFileConfigs.scale
	};

	let activationStatus = await realvision.GetActivationStatus();
	//Check if you have the right to use the online slicer
	if (activationStatus) {
		//Provide the ApiRequest object which contains all the information the StartSlicingTask() function needs.
		await realvision
			.UploadFile(
				stlFileConfigs.filename,
				ASSETS_FOLDER + stlFileConfigs.filename
			)
			.then(fileId => {
				ApiRequest.fileId = fileId;
				return StartSlicingTask(ApiRequest);
			})
			.then(taskId => {
				//Check the progress of the slicing task every 1000 ms (1 second)
				let loop = setInterval(async () => {
					let progress = await realvision.GetProgress(taskId);
					//Stop calling the GetProgress endpoint when you get "1"
					//then you'll be able to get Printing Information and also be able to download the GCode or FCode file
					if (progress === "1") {
						clearInterval(loop);
						await realvision.GetPrintingInformation(taskId);
						await realvision.DownloadFile(taskId);
					} else if (progress == "-1") {
						clearInterval(loop);
						console.log(
							"Error: An error occured while getting the progress of the slicing, please check if the extention of the file used is .rvwj ... "
						);
					}
				}, CHECK_PROGRESS_INTERVAL);
			});
	}
}
