(function(obj) {

	var requestFileSystem = obj.webkitRequestFileSystem || obj.mozRequestFileSystem || obj.requestFileSystem;

	function onerror(message) {
		alert(message);
	}

	function createTempFile(callback) {
		var tmpFilename = "tmp.zip";
		requestFileSystem(TEMPORARY, 4 * 1024 * 1024 * 1024, function(filesystem) {
			function create() {
				filesystem.root.getFile(tmpFilename, {
					create : true
				}, function(zipFile) {
					callback(zipFile);
				});
			}

			filesystem.root.getFile(tmpFilename, null, function(entry) {
				entry.remove(create, create);
			}, create);
		});
	}

	var model = (function() {
		var zipFileEntry, zipWriter, writer, creationMethod, URL = obj.webkitURL || obj.mozURL || obj.URL;

		return {
			setCreationMethod : function(method) {
				creationMethod = method;
			},
			addFiles : function addFiles(files, oninit, onadd, onprogress, onend) {
				var addIndex = 0;

				function nextFile() {
					var file = files[addIndex];
					onadd(file);
					zipWriter.add(file.name, new zip.BlobReader(file), function() {
						addIndex++;
						if (addIndex < files.length)
							nextFile();
						else
							onend();
					}, onprogress);
				}

				function createZipWriter() {
					zip.createWriter(writer, function(writer) {
						zipWriter = writer;
						oninit();
						nextFile();
					}, onerror);
				}

				if (zipWriter)
					nextFile();
				else if (creationMethod == "Blob") {
					writer = new zip.BlobWriter();
					createZipWriter();
				} else {
					createTempFile(function(fileEntry) {
						zipFileEntry = fileEntry;
						writer = new zip.FileWriter(zipFileEntry);
						createZipWriter();
					});
				}
			},
			getBlobURL : function(callback) {
				zipWriter.close(function(blob) {
					callback(creationMethod == "Blob" ? URL.createObjectURL(blob) : zipFileEntry.toURL());
					zipWriter = null;
				});
			}
		};
	})();

	(function() {
		var fileInput = document.getElementById("file-input");
		var zipProgress = document.createElement("progress");
		var downloadButton = document.getElementById("download-button");
		var fileList = document.getElementById("file-list");
		var filenameInput = document.getElementById("filename-input");
		var creationMethodInput = document.getElementById("creation-method-input");
		if (requestFileSystem)
			creationMethodInput.value = "File";
		else
			creationMethodInput.options.length = 1;
		model.setCreationMethod(creationMethodInput.value);
		fileInput.addEventListener('change', function() {
			fileInput.disabled = true;
			creationMethodInput.disabled = true;
			model.addFiles(fileInput.files, function() {
			}, function(file) {
				var li = document.createElement("li");
				zipProgress.value = 0;
				zipProgress.max = 0;
				li.textContent = file.name;
				li.appendChild(zipProgress);
				fileList.appendChild(li);
			}, function(current, total) {
				zipProgress.value = current;
				zipProgress.max = total;
			}, function() {
				if (zipProgress.parentNode)
					zipProgress.parentNode.removeChild(zipProgress);
				fileInput.value = "";
				fileInput.disabled = false;
			});
		}, false);
		creationMethodInput.addEventListener('change', function() {
			model.setCreationMethod(creationMethodInput.value);
		}, false);
		downloadButton.addEventListener("click", function(event) {
			var target = event.target, entry;
			if (!downloadButton.download) {
				model.getBlobURL(function(blobURL) {
					var clickEvent = document.createEvent("MouseEvent");
					clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
					downloadButton.href = blobURL;
					downloadButton.download = filenameInput.value;
					downloadButton.dispatchEvent(clickEvent);
					creationMethodInput.disabled = false;
					fileList.innerHTML = "";
				});
				event.preventDefault();
				return false;
			}
		}, false);

	})();

})(this);
