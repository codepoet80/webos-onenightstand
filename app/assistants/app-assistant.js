/*
In the app assistant, we setup some app-wide global objects and handle different kinds of launches, creating and delegating to the main stage
*/
var systemModel = null;
var appModel = null;
var hueModel = null;

function AppAssistant() {
    appModel = new AppModel();
    systemModel = new SystemModel();
    hueModel = new HueModel();
    Mojo.Additions = Additions;
}

//This function will handle relaunching the app when an alarm goes off(see the device/alarm scene)
AppAssistant.prototype.handleLaunch = function(params) {
    appModel.LoadSettings();
    Mojo.Log.info("** App Settings: " + JSON.stringify(appModel.AppSettingsCurrent));

    //get the proxy for the stage in the event it already exists (eg: app is currently open)
    var mainStage = this.controller.getStageProxy("");
    Mojo.Log.info("Night Stand App is Launching! Launch params: " + JSON.stringify(params));

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