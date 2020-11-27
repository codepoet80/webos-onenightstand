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
            maxValue: 254
        },
        this.model = {
            value: 126,
            disabled: true
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
    //TODO: Text-based tap targets are too small

    //Non-Mojo lamp widgets will be setup in the activate function

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("slideBright"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    //Event handler registration for non-Mojo widgets
    $("tdLampOne").addEventListener("click", this.handleLampTap.bind(this));
    $("tdLampTwo").addEventListener("click", this.handleLampTap.bind(this));
    $("txtAllOn").addEventListener("click", this.handleElementTap.bind(this));
    $("txtAllOff").addEventListener("click", this.handleElementTap.bind(this));
    $("txtDimmer").addEventListener("click", this.toggleDimmerSlider.bind(this));
};

//Actually more fool-proof to make these global
var updateLightsInt;
var goBackTimeout;
LampAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */

    //Non-Mojo widget data object
    this.Lamp1 = {
        num: -1,
        name: "Lamp 1",
        on: false
    };
    if (appModel.AppSettingsCurrent["hueSelectedLights"].length > 0) {
        this.Lamp1 = {
            num: appModel.AppSettingsCurrent["hueSelectedLights"][0],
        };
    }
    this.Lamp2 = {
        num: -1,
        name: "Lamp 2",
        on: false
    };
    if (appModel.AppSettingsCurrent["hueSelectedLights"].length > 1) {
        $("tdLampTwo").style.display = "block";
        this.Lamp2 = {
            num: appModel.AppSettingsCurrent["hueSelectedLights"][1],
        };
    } else {
        $("tdLampTwo").style.display = "none";
    }
    this.iconSize = 64;

    document.body.style.backgroundColor = "black";
    var stageController = Mojo.Controller.stageController;
    stageController.setWindowOrientation("left");
    this.toggleDimmerSlider();

    if (appModel.AppSettingsCurrent["hueSelectedLights"] != undefined && appModel.AppSettingsCurrent["hueSelectedLights"].length > 0) {
        this.updateLightList();
        updateLightsInt = setInterval(this.updateLightList.bind(this), 6000);
        this.setTimerToGoBack();
    } else {
        Mojo.Additions.ShowDialogBox("No Lights Configured", "You don't have any lights selected, so this scene can't do anything. Visit Settings to pair with your Hue bridge and select some lights.")
    }
};

LampAssistant.prototype.updateLightList = function() {
    hueModel.GetLightList(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], function(lights) {
        //Mojo.Log.info("** updating LIGHT state")
        for (var i = 0; i < lights.length; i++) {
            var thisLight = lights[i];
            if (thisLight.num == appModel.AppSettingsCurrent["hueSelectedLights"][0]) {
                this.Lamp1 = thisLight;
            }
            if (thisLight.num == appModel.AppSettingsCurrent["hueSelectedLights"][1]) {
                this.Lamp2 = thisLight;
            }
        }
        this.updateLampState();
    }.bind(this));
}

LampAssistant.prototype.updateLampState = function() {
    //Mojo.Log.info("*** updating LAMP state: " + this.iconSize);
    if (this.Lamp1.name != document.getElementById("divLampOne").innerText)
        $("divLampOne").innerText = this.Lamp1.name;
    $("imgLampOne").src = this.getLampImageFromState(this.Lamp1);

    if (this.Lamp2.name != document.getElementById("divLampTwo").innerText)
        $("divLampTwo").innerText = this.Lamp2.name;
    $("imgLampTwo").src = this.getLampImageFromState(this.Lamp2);
}

LampAssistant.prototype.getLampImageFromState = function(lamp) {
    var imgSrcBase = "images/Lamp-";
    var imgSrc;
    if (lamp.num == -1)
        imgSrc = "Unknown-";
    else {
        if (lamp.on)
            imgSrc = "On-";
        else
            imgSrc = "Off-";
        if (!lamp.reachable)
            imgSrc = "Offline-";
    }
    imgSrc = imgSrc + this.iconSize + ".png";
    return imgSrcBase + imgSrc;
}

LampAssistant.prototype.handleLampTap = function(event) {
    this.setTimerToGoBack();

    var currLampImg = (event.srcElement.title + "").replace("Lamp", "imgLamp");
    var lampNum;
    var newLampStateOn = true;
    if (event.srcElement.title.indexOf("One") != -1) {
        lampNum = this.Lamp1.num;
        if (this.Lamp1.on)
            newLampStateOn = false;
        this.Lamp1.on = newLampStateOn;
    } else {
        lampNum = this.Lamp2.num;
        if (this.Lamp2.on)
            newLampStateOn = false;
        this.Lamp2.on = newLampStateOn;
    }

    if (!newLampStateOn) {
        Mojo.Log.info(event.srcElement.title + " should turn off");
        document.getElementById(currLampImg).src = "images/Lamp-Off-" + this.iconSize + ".png";
        hueModel.TurnLightOff(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], lampNum);
    } else {
        Mojo.Log.info(event.srcElement.title + " should turn on");
        document.getElementById(currLampImg).src = "images/Lamp-On-" + this.iconSize + ".png";
        hueModel.TurnLightOn(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], lampNum);
    }
    event.stopPropagation();
}

LampAssistant.prototype.handleElementTap = function(event) {
    this.setTimerToGoBack();

    if (event.srcElement.id == "txtDimmer") {
        this.toggleDimmerSlider();
    } else if (event.srcElement.id == "txtAllOn") {
        for (var l = 0; l < appModel.AppSettingsCurrent["hueSelectedLights"].length; l++) {
            hueModel.TurnLightOn(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], appModel.AppSettingsCurrent["hueSelectedLights"][l]);
            document.getElementById("imgLampOne").src = "images/Lamp-On-" + this.iconSize + ".png";
            document.getElementById("imgLampTwo").src = "images/Lamp-On-" + this.iconSize + ".png";
        }
    } else if (event.srcElement.id == "txtAllOff") {
        for (var l = 0; l < appModel.AppSettingsCurrent["hueSelectedLights"].length; l++) {
            hueModel.TurnLightOff(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], appModel.AppSettingsCurrent["hueSelectedLights"][l]);
            document.getElementById("imgLampOne").src = "images/Lamp-Off-" + this.iconSize + ".png";
            document.getElementById("imgLampTwo").src = "images/Lamp-Off-" + this.iconSize + ".png";
        }
    }
}

LampAssistant.prototype.toggleDimmerSlider = function(show) {
    this.setTimerToGoBack();

    var dimmer = $("slideBright");
    if (dimmer.style.display == "none") {
        dimmer.style.display = "block";
        var thisWidgetSetup = this.controller.getWidgetSetup("slideBright");
        var thisWidgetModel = thisWidgetSetup.model;
        thisWidgetModel.disabled = false;
        this.controller.modelChanged(thisWidgetModel);

    } else {
        dimmer.style.display = "none";
        var thisWidgetSetup = this.controller.getWidgetSetup("slideBright");
        var thisWidgetModel = thisWidgetSetup.model;
        thisWidgetModel.disabled = true;
        this.controller.modelChanged(thisWidgetModel);
    }
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

LampAssistant.prototype.handleValueChange = function(event) {
    this.setTimerToGoBack();

    Mojo.Log.info(event.srcElement.title + " now: " + event.value);
    if (event.srcElement.title == "lightBright") {
        var newDimVal = Math.round(event.value);
        for (var l = 0; l < appModel.AppSettingsCurrent["hueSelectedLights"].length; l++) {
            hueModel.SetLightBrightness(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], appModel.AppSettingsCurrent["hueSelectedLights"][l], newDimVal, false);
        }
    }
};

LampAssistant.prototype.setTimerToGoBack = function() {
    clearTimeout(goBackTimeout);
    var useTimeout = (appModel.DisplayTimeout - 10) * 1000;
    goBackTimeout = setTimeout(function() {
        var stageController = Mojo.Controller.stageController;
        Mojo.Log.info("Scene timer expired due to lack of activity, returning to clock scene.");
        stageController.pushScene({ name: "main", disableSceneScroller: false });
    }, useTimeout)
}

LampAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    clearTimeout(goBackTimeout);
    clearInterval(updateLightsInt);

    Mojo.Event.stopListening(this.controller.get("slideBright"), Mojo.Event.propertyChange, this.handleValueChange);
    //Event handler de-registration for non-Mojo widgets
    $("tdLampOne").removeEventListener("click", this.handleLampTap);
    $("tdLampTwo").removeEventListener("click", this.handleLampTap);
    $("txtAllOn").removeEventListener("click", this.handleElementTap);
    $("txtAllOff").removeEventListener("click", this.handleElementTap);
    $("txtDimmer").removeEventListener("click", this.toggleDimmerSlider);
};

LampAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
    clearTimeout(goBackTimeout);
    clearInterval(updateLightsInt);
};