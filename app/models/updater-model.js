/*
Updater Model
 Version 0.1
 Created: 2020
 Author: Jonathan Wise
 License: MIT
 Description: A model to check for and get updates from App Museum II web service.
    Does not require App Museum to be installed, but does require internet access, and Preware to do the actual install.
*/

var UpdaterModel = function() {
    this.updateURL = "http://appcatalog.webosarchive.com/WebService/getLatestVersionInfo.php?One+Night+Stand";
};

//Check App Museum II web service to see if there are any updates
UpdaterModel.prototype.CheckForUpdate = function(callback) {

    Mojo.Log.info("UpdaterModel identified current app as: " + Mojo.Controller.appInfo.id);
    var currVersion = this.getVersionObject(Mojo.Controller.appInfo.version);
    Mojo.Log.info("UpdaterModel identified current version: " + JSON.stringify(currVersion));

    // set scope for xmlhttp anonymous function callback
    if (callback)
        callback = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", this.updateURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            if (xmlhttp.responseText != null) {
                //Mojo.Log.info("Museum responded: " + xmlhttp.responseText);
                var updateResponse = JSON.parse(xmlhttp.responseText);
                if (updateResponse.version != null) {
                    var museumVersion = this.getVersionObject(updateResponse.version);
                    //Mojo.Log.info("Museum version: " + JSON.stringify(museumVersion));
                    if (this.isVersionHigher(currVersion, museumVersion)) {
                        Mojo.Log.warn("UpdaterModel found an update in webOS App Museum II!");
                        updateResponse.updateFound = true;
                    } else {
                        Mojo.Log.info("UpdaterModel did not find an update in webOS App Museum II!");
                        updateResponse = false;
                    }
                }
                //Mojo.Log.info("New update response object: " + JSON.stringify(updateResponse));
                if (callback) {
                    Mojo.Log.info("Executing update check callback");
                    callback(updateResponse);
                }
            }
        }
    }.bind(this);
}

UpdaterModel.prototype.getVersionObject = function(versionNum) {
    versionNumParts = versionNum.split(".");
    if (versionNumParts.length <= 2 || versionNumParts > 3) {
        Mojo.Log.error("UpdaterModel: An invalid version number was passed, webOS version numbers are #.#.#");
        return false;
    } else {
        var versionObject = {
            majorVersion: versionNumParts[0] * 1,
            minorVersion: versionNumParts[1] * 1,
            buildVersion: versionNumParts[2] * 1
        }
        return versionObject;
    }
}

UpdaterModel.prototype.isVersionHigher = function(currVersion, compareVersion) {
    if (!currVersion || !compareVersion) {
        Mojo.Log.error("UpdaterModel: Pass the versions to compare. If the second version is higher than the first, this function will return true");
    } else {
        if (compareVersion.majorVersion > currVersion.majorVersion)
            return true;
        if (compareVersion.majorVersion == currVersion.majorVersion && compareVersion.minorVersion > currVersion.minorVersion)
            return true;
        if (compareVersion.majorVersion == currVersion.majorVersion && compareVersion.minorVersion == currVersion.minorVersion && compareVersion.buildVersion > currVersion.buildVersion)
            return true;
        return false;
    }
}

//Ask PreWare
UpdaterModel.prototype.InstallUpdate = function() {

}