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
    //TODO: Copy this to activate and we won't have to re-launch app to apply this setting
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
};

MainAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    document.body.style.backgroundColor = "black";
    var stageController = Mojo.Controller.stageController;
    if (!appModel.IsTouchPad)
        stageController.setWindowOrientation("left");
    else
        stageController.setWindowOrientation("right");

    //Apply preferences to Command bar
    var thisWidgetModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
    thisWidgetModel.items[1].items = [];
    if (appModel.AppSettingsCurrent["showAlarmButton"])
        thisWidgetModel.items[1].items.push({ label: 'Alarms', iconPath: 'images/Alarm.png', command: 'do-alarms' });
    thisWidgetModel.items[1].items.push({ label: 'Settings', iconPath: 'images/SettingsGear.png', command: 'do-settings' });
    if (this.menuOn) {
        thisWidgetModel.visible = false;
        this.menuOn = false;
    } else {
        thisWidgetModel.visible = true;
        this.menuOn = true;
    }
    this.controller.modelChanged(thisWidgetModel);

    // Setup the clock face
    this.controller.get("clock").style.color = appModel.AppSettingsCurrent["clockColor"];
    this.controller.get("clock").style.fontSize = (appModel.AppSettingsCurrent["clockSize"] + "px");
    this.controller.get("clock").style.marginTop = this.calculateClockPosition(appModel.AppSettingsCurrent["clockSize"], true) + "px";
    this.updateClock(true);
    this.clockInt = setInterval(this.updateClock.bind(this), 6000);
}

MainAssistant.prototype.calculateClockPosition = function(fontSize, isLandscape) {
    fontSize = Math.round(fontSize);
    var screenWidth;
    var screenHeight;
    if (isLandscape) {
        //Since we're forcing landscape, screen width is actually our height
        screenWidth = window.screen.height;
        screenHeight = window.screen.width;
    } else {
        screenWidth = window.screen.width;
        screenHeight = window.screen.height;
    }
    Mojo.Log.info("== height: " + screenHeight);
    Mojo.Log.info("== width:  " + screenWidth);
    Mojo.Log.info("== font: " + fontSize);
    if (appModel.IsTouchPad)
        var useTop = (screenHeight / 2) - 90 - fontSize;
    else
        var useTop = (screenHeight / 2) - Math.round(fontSize / 1.15);
    Mojo.Log.info("=== useTop: " + useTop);
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

    //TODO: Add support for 24-hour time
    hour = this.confirmTime(hour);
    if (hour > 12)
        hour = hour - 12;
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

MainAssistant.prototype.toggleCommandMenu = function() {
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();

        var thisWidgetSetup = this.controller.getWidgetSetup(Mojo.Menu.commandMenu);
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
                    this.toggleCommandMenu();
                    clearTimeout(this.hideMenuTimeout);
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                    stageController.setWindowOrientation("free");
                    break;
                }
            case 'do-alarms':
                {
                    systemModel.LaunchApp("com.palm.app.clock");
                    break;
                }
            case 'do-lamps':
                {
                    this.toggleCommandMenu();
                    clearTimeout(this.hideMenuTimeout);
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "lamp", disableSceneScroller: true });
                    break;
                }
        }
    }
    Mojo.Log.info("current scene: " + currentScene.sceneName);
};

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