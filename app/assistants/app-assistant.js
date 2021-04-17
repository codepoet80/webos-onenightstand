/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var systemModel = null;
var appModel = null;
var hueModel = null;
var updaterModel = null;

function AppAssistant(appController) {
    appModel = new AppModel();
    systemModel = new SystemModel();
    hueModel = new HueModel();
    updaterModel = new UpdaterModel();
    Mojo.Additions = Additions;
    this.appController = appController;
    appModel.ExhibitionStart = false;
}

AppAssistant.prototype.handleLaunch = function(params) {
    appModel.LoadSettings();
    this.getDeviceInfo();

    if (params) {
        Mojo.Log.info("** Launch Params: " + JSON.stringify(params));
        if (params.dockMode || params.touchstoneMode) {
            appModel.dockMode = true;
            Mojo.Log.warn("** Exhibition mode Launch! **");
        }
    }
    var mainStage = this.controller.getStageProxy("");
    if (mainStage) { //if the stage already exists then just bring it into focus
        Mojo.Log.info("Existing stage was found!");
        var stageController = this.controller.getStageController("");
        if (stageController.isActiveAndHasScenes()) {
            Mojo.Log.info("Stage active and has scenes");
            stageController.activate();
        } else {
            Mojo.Log.warn("*** Handling problematic lifecycle state!");
            if (appModel.ExhibitionStart || !stageController.activeScene()) {
                Mojo.Log.info("Found Exhibition mode running, activating");
                this.RestartExhibition();
            } else {
                Mojo.Log.info("Found App mode running, activating");
                stageController.activate();
            }
        }
    }
}

//Play a pre-defined system sound
AppAssistant.prototype.RestartExhibition = function(soundName) {
    Mojo.Log.info("Restarting exhibition");
    this.soundRequest = new Mojo.Service.Request("palm://com.palm.display/control", {
        method: "setState",
        parameters: {
            state: "dock"
        },
        onSuccess: function() { success = true; },
        onFailure: function(e) { Mojo.Log.error(e); }
    });
}

AppAssistant.prototype.getDeviceInfo = function() {
    Mojo.Log.info("screen width " + window.screen.width + ", height " + window.screen.height);
    if (Mojo.Environment.DeviceInfo.platformVersionMajor >= 3)
        appModel.DeviceType = "Touchpad";
    else {
        if (window.screen.width == 800 || window.screen.height == 800)
            appModel.DeviceType = "Pre3";
        else if ((window.screen.width == 480 || window.screen.height == 480) && (window.screen.width == 320 || window.screen.height == 320))
            appModel.DeviceType = "Pre";
        else
            appModel.DeviceType = "Tiny";
    }
    if (appModel.DeviceType == "Touchpad")
        Mojo.Log.warn("Launching on a TouchPad, some behaviors will change!");
    else if (appModel.DeviceType == "Pre")
        Mojo.Log.info("Launching on a Pre or Pre 2")
    else if (appModel.DeviceType == "Tiny")
        Mojo.Log.info("Launching on a Pixi or Veer");
    else
        Mojo.Log.warn("Launching on a Pre3");
}