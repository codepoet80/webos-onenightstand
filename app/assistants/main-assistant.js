function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
    this.clockDimmed = false;
    this.PreviousBrightness = 20;
    this.PreviousSystemVolume = 20;
    this.PreviousRingtoneVolume = 20;
    this.Lamps = [];
}

MainAssistant.prototype.setup = function() {
    /* this function is for setup tasks that have to happen when the scene is first created */
    /* use Mojo.View.render to render view templates and add them to the scene, if needed */

    /* setup widgets here */
    // Setup command buttons (menu)
    this.cmdMenuAttributes = {
        menuClass: 'black-command-menu'
    }
    this.cmdMenuModel = {
        visible: false,
        items: [{
                items: [
                    { label: 'Lamps', iconPath: 'images/Lightbulb.png', command: 'do-lamps' }
                ]
            },
            {
                items: []
            }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.commandMenu, this.cmdMenuAttributes, this.cmdMenuModel);
    this.menuOn = false;

    // Remember and set display settings
    systemModel.GetSystemBrightness(function(response) {
        if (response.maximumBrightness != undefined)
            appModel.PreviousBrightness = response.maximumBrightness;
        if (response.timeout != null)
            appModel.DisplayTimeout = response.timeout;
    });
    systemModel.PreventDisplaySleep();
    if (!appModel.DeviceType == "Touchpad")
        systemModel.SetDisplayState("unlock"); //Unlock the screen

    // Remember volume settings
    systemModel.GetSystemVolume(function(response) {
        if (response.returnValue) {
            this.PreviousSystemVolume = response.volume;
        }
    });
    systemModel.GetRingtoneVolume(function(response) {
        if (response.returnValue) {
            this.PreviousRingtoneVolume = response.volume;
        }
    });

    /* add event handlers to listen to events from widgets */
    this.controller.listen("clock", Mojo.Event.tap, this.handleClockTap.bind(this));

    //Check for updates
    updaterModel.CheckForUpdate("One Night Stand", this.handleUpdateResponse.bind(this));

};

MainAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    document.body.style.backgroundColor = "black";
    var stageController = Mojo.Controller.stageController;
    if (!appModel.DeviceType == "Touchpad")
        stageController.setWindowOrientation("left");
    else
        stageController.setWindowOrientation("right");

    //Apply preferences to Command bar
    var thisWidgetModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
    thisWidgetModel.items[1].items = [];
    try {
        if (appModel.AppSettingsCurrent["showAlarmButton"])
            thisWidgetModel.items[1].items.push({ label: 'Alarms', iconPath: 'images/Alarm.png', command: 'do-alarms' });
    } catch (ex) {
        Mojo.Log.error("A compatibility issue occured reading settings. Preferences will be reset.");
        appModel.ResetSettings();
    }
    thisWidgetModel.items[1].items.push({ label: 'Settings', iconPath: 'images/SettingsGear.png', command: 'do-settings' });
    if (this.menuOn) {
        thisWidgetModel.visible = false;
        this.menuOn = false;
    } else {
        thisWidgetModel.visible = true;
        this.menuOn = true;
    }
    this.controller.modelChanged(thisWidgetModel);
    this.toggleCommandMenu(false);

    // Setup the clock face
    this.controller.get("clock").style.color = appModel.AppSettingsCurrent["clockColor"];
    this.controller.get("clock").style.fontSize = (appModel.AppSettingsCurrent["clockSize"] + "px");
    this.controller.get("clock").style.marginTop = this.calculateClockPosition(appModel.AppSettingsCurrent["clockSize"], true) + "px";
    this.updateClock(true);
    this.clockInt = setInterval(this.updateClock.bind(this), 6000);
}

MainAssistant.prototype.calculateClockPosition = function(fontSize, isLandscape) {
    fontSize = Math.round(fontSize);
    var checkWidth = window.screen.width;
    var checkHeight = window.screen.height;
    var screenWidth;
    var screenHeight;
    //  A race condition on the TouchPad can make these values wrong, so we double check
    if (!isLandscape || (isLandscape && appModel.DeviceType == "Touchpad" && checkHeight > checkWidth)) {
        screenWidth = checkWidth;
        screenHeight = checkHeight;
    } else {
        //Since we're forcing landscape, screen width should actually be our height
        screenWidth = checkHeight;
        screenHeight = checkWidth;
    }
    //Mojo.Log.info("== height: " + screenHeight);
    //Mojo.Log.info("== width:  " + screenWidth);
    //Mojo.Log.info("== font: " + fontSize);
    var useTop = (screenHeight / 2) - Math.round(fontSize / 1.15);
    if (appModel.DeviceType == "Touchpad") {
        screenHeight = screenHeight - 170;
        useTop = (screenHeight / 2) - (fontSize / 1.05);
    } else if (appModel.DeviceType == "Tiny") {
        screenHeight = screenHeight - 12;
        useTop = (screenHeight / 2) - (fontSize / 1.15);
    }
    //Mojo.Log.warn("=== useTop: " + useTop);
    return useTop;
}

MainAssistant.prototype.handleClockTap = function() {
    clearTimeout(this.hideMenuTimeout);
    if (!this.menuOn) {
        this.hideMenuTimeout = setTimeout(this.toggleCommandMenu.bind(this), 8000);
    }
    this.toggleCommandMenu();
}

MainAssistant.prototype.updateClock = function(skipDim) {
    var time = new Date();
    hour = time.getHours();
    min = time.getMinutes();
    sec = time.getSeconds();

    this.confirmDimSetings(hour, min);

    if (hour > 12 && !appModel.AppSettingsCurrent["use24HourTime"])
        hour = hour - 12;
    if (hour == 0 && !appModel.AppSettingsCurrent["use24HourTime"])
        hour = 12;
    min = this.confirmTime(min);
    sec = this.confirmTime(sec);
    this.controller.get("clock").innerHTML = hour + ":" + min;
};

MainAssistant.prototype.confirmTime = function(str) {
    if (parseInt(str) < 10) {
        return "0" + str;
    } else {
        return str;
    }
};

MainAssistant.prototype.confirmDimSetings = function(hour, min) {
    //Change brightness and volume if necessary
    if (this.clockDimmed && ((hour > appModel.AppSettingsCurrent["wakeTimeHour"] && hour < appModel.AppSettingsCurrent["darkTimeHour"]) ||
            (hour == appModel.AppSettingsCurrent["wakeTimeHour"] && min >= appModel.AppSettingsCurrent["wakeTimeMin"]))) {

        //Mojo.Log.info("Time to brighten the screen");
        systemModel.SetSystemBrightness(this.PreviousBrightness);
        if (appModel.AppSettingsCurrent["muteWhileDark"]) {
            if (this.PreviousSystemVolume > 0)
                systemModel.SetSystemVolume(this.PreviousSystemVolume);
            if (this.PreviousRingtoneVolume > 0)
                systemModel.SetRingtoneVolume(this.PreviousRingtoneVolume);
        }
        this.clockDimmed = false;
    }
    if (!this.clockDimmed && (hour > appModel.AppSettingsCurrent["darkTimeHour"] ||
            (hour == appModel.AppSettingsCurrent["darkTimeHour"] && min >= appModel.AppSettingsCurrent["darkTimeMin"]))) {

        //Mojo.Log.info("Time to dim the screen");
        systemModel.SetSystemBrightness(appModel.AppSettingsCurrent["dimLevel"]);
        if (appModel.AppSettingsCurrent["muteWhileDark"]) {
            if (this.PreviousSystemVolume > 0)
                systemModel.SetSystemVolume(0);
            if (this.PreviousRingtoneVolume > 0)
                systemModel.SetRingtoneVolume(0);
        }
        this.clockDimmed = true;
    }
}

MainAssistant.prototype.toggleCommandMenu = function(show) {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetSetup = this.controller.getWidgetSetup(Mojo.Menu.commandMenu);
        var thisWidgetModel = thisWidgetSetup.model;
        if (!this.menuOn || show == true) {
            thisWidgetModel.visible = true;
            this.menuOn = true;
        } else {
            thisWidgetModel.visible = false;
            this.menuOn = false;
        }
        this.controller.modelChanged(thisWidgetModel);
    }
}

MainAssistant.prototype.handleCommand = function(event) {
    Mojo.Log.info("handling command button press for command: " + event.command);
    var currentScene = Mojo.Controller.stageController.activeScene();
    var stageController = Mojo.Controller.stageController;
    var appController = Mojo.Controller.getAppController();
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-settings':
                {
                    this.toggleCommandMenu(false);
                    clearTimeout(this.hideMenuTimeout);
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                    stageController.setWindowOrientation("free");
                    break;
                }
            case 'do-alarms':
                {
                    this.toggleCommandMenu(false);
                    systemModel.LaunchApp("com.palm.app.clock");
                    break;
                }
            case 'do-lamps':
                {
                    this.toggleCommandMenu(false);
                    clearTimeout(this.hideMenuTimeout);
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "lamp", disableSceneScroller: true });
                    break;
                }
        }
    }
    Mojo.Log.info("current scene: " + currentScene.sceneName);
};

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    clearInterval(this.clockInt);
    Mojo.Event.stopListening(this.controller.get("clock"), Mojo.Event.tap, this.handleClockTap.bind(this));

    if (this.clockDimmed) {
        this.clockDimmed = false;
        systemModel.SetSystemBrightness(this.PreviousBrightness);
        if (this.PreviousSystemVolume > 0)
            systemModel.SetSystemVolume(this.PreviousSystemVolume);
        if (this.PreviousRingtoneVolume > 0)
            systemModel.SetRingtoneVolume(this.PreviousRingtoneVolume);
        systemModel.AllowDisplaySleep(); //This one fails on exit, but that's ok cause the OS takes care of it
    }
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};