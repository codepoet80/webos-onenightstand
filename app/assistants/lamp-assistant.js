function LampAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

LampAssistant.prototype.setup = function() {
    /* this function is for setup tasks that have to happen when the scene is first created */
    /* use Mojo.View.render to render view templates and add them to the scene, if needed */

    /* setup widgets here */
    //Slider
    this.controller.setupWidget("slideBright",
        this.attributes = {
            minValue: 1,
            maxValue: 100
        },
        this.model = {
            value: 50,
            disabled: false
        }
    );

    // Setup command buttons (menu)
    this.cmdMenuAttributes = {
        menuClass: 'black-command-menu'
    }
    this.cmdMenuModel = {
        visible: true,
        items: [{
                items: [
                    { label: $L('Settings'), iconPath: 'images/Clock.png', command: 'do-clock' }
                ]
            },
            {
                items: [
                    { label: $L('Lamp'), iconPath: 'images/SettingsGear.png', command: 'do-settings' }
                ]
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);

    // Remember and set display settings

    /* add event handlers to listen to events from widgets */
    //this.controller.listen("clock", Mojo.Event.tap, this.handleClockTap.bind(this));
    //Event handler registration for non-Mojo widgets
    //$("imgLampOne").addEventListener("click", this.handleLampTap.bind(this));
    //$("imgLampTwo").addEventListener("click", this.handleLampTap.bind(this));
    $("tdLampOne").addEventListener("click", this.handleLampTap.bind(this));
    $("tdLampTwo").addEventListener("click", this.handleLampTap.bind(this));
    //$("divLampOne").addEventListener("click", this.handleLampTap.bind(this));
    //$("divLampTwo").addEventListener("click", this.handleLampTap.bind(this));
    $("txtAllOn").addEventListener("click", this.handleElementTap.bind(this));
    $("txtAllOff").addEventListener("click", this.handleElementTap.bind(this));
    $("txtDimmer").addEventListener("click", this.toggleDimmerSlider.bind(this));
};

LampAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    document.body.style.backgroundColor = "black";
    var stageController = Mojo.Controller.stageController;
    stageController.setWindowOrientation("left");
    //this.toggleDimmerSlider();
    //TODO: read lamp state (repeatedly)
};

LampAssistant.prototype.handleLampTap = function(event) {
    Mojo.Log.info("Received tap from: " + event.srcElement.id + " representing " + event.srcElement.title);
    var currLampImg = (event.srcElement.title + "").replace("Lamp", "imgLamp");

    //TODO: This block takes the place of a proper lamp lookup
    var lampId;
    if (event.srcElement.title.indexOf("One") != -1)
        lampId = 3
    else
        lampId = 2;

    if ($(currLampImg).src.indexOf("-On") != -1) {
        Mojo.Log.info(event.srcElement.title + " should turn off");
        $(currLampImg).src = $(currLampImg).src.replace("-On", "-Off");
        hueModel.TurnLightOff(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], lampId)
    } else {
        Mojo.Log.info(event.srcElement.title + " should turn on");
        $(currLampImg).src = $(currLampImg).src.replace("-Off", "-On");
        Mojo.Log.info("done!")
        hueModel.TurnLightOn(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], lampId)
    }
}

LampAssistant.prototype.handleElementTap = function(event) {
    if (event.srcElement.id == "txtDimmer") {
        this.toggleDimmerSlider();
    } else if (event.srcElement.id == "txtAllOn") {
        hueModel.TurnLightOn(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], 2)
        hueModel.TurnLightOn(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], 3)
    } else if (event.srcElement.id == "txtAllOff") {
        hueModel.TurnLightOff(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], 2)
        hueModel.TurnLightOff(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], 3)
    }
}

LampAssistant.prototype.toggleDimmerSlider = function(event) {
    Mojo.Log.info("test val at toggleDimmerSlider: " + this.TestVal);
    var dimmer = $("slideBright");
    Mojo.Log.info("slider currently: " + dimmer.style.display);
    if (dimmer.style.display == "none")
        dimmer.style.display = "block";
    else
        dimmer.style.display = "none";

    /*  var stageController = Mojo.Controller.getAppController().getActiveStageController();
        if (stageController) {
            this.controller = stageController.activeScene();

            var thisWidgetSetup = this.controller.getWidgetSetup(slideBright);
            var thisWidgetModel = thisWidgetSetup.model;
            if (this.menuOn) {
                thisWidgetModel.visible = false;
                this.menuOn = false;
            } else {
                thisWidgetModel.visible = true;
                this.menuOn = true;
            }
            this.controller.modelChanged(thisWidgetModel);
        }
    */
}

LampAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("handling command button press for command: " + event.command);
    var currentScene = Mojo.Controller.stageController.activeScene();
    var stageController = Mojo.Controller.stageController;
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-settings':
                {
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                    stageController.setWindowOrientation("free");
                    break;
                }
            case 'do-clock':
                {
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "main", disableSceneScroller: true });
                    break;
                }
        }
    }
    Mojo.Log.info("current scene: " + currentScene.sceneName);
};


LampAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
};

LampAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};