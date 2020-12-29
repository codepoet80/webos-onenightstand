/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var systemModel = null;
var appModel = null;
var hueModel = null;
var updaterModel = null;

function AppAssistant() {
    appModel = new AppModel();
    systemModel = new SystemModel();
    hueModel = new HueModel();
    updaterModel = new UpdaterModel();
    Mojo.Additions = Additions;
}

//This function will handle relaunching the app when an alarm goes off(see the device/alarm scene)
AppAssistant.prototype.handleLaunch = function(params) {
    appModel.LoadSettings();
    Mojo.Log.info("** App Settings: " + JSON.stringify(appModel.AppSettingsCurrent));

    //find out if this is a touchpad
    Mojo.Log.info("screen width " + window.screen.width + ", height " + window.screen.height);
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3)
        appModel.DeviceType = "Touchpad";
    else {
        if (window.screen.width == 800 || window.screen.height == 800)
            appModel.DeviceType = "Pre3";
        else
            appModel.DeviceType = "Tiny";
    }
    if (appModel.DeviceType == "Touchpad")
        Mojo.Log.warn("Launching on a TouchPad, some behaviors will change!");
    else if (appModel.DeviceType == "Tiny")
        Mojo.Log.warn("Launching on a Pre2 or smaller");
    else
        Mojo.Log.warn("Launching on a Pre3");

    //get the proxy for the stage in the event it already exists (eg: app is currently open)
    var mainStage = this.controller.getStageProxy("");
    Mojo.Log.info("One Night Stand is Launching! Launch params: " + JSON.stringify(params));

    if (!params || params["action"] == undefined) //If no parameters were passed, this is a normal launch
    {
        if (mainStage) //if the stage already exists then just bring it into focus
        {
            var stageController = this.controller.getStageController("");
            stageController.activate();
        }
        return;
    }
};