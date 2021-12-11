function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
    this.clockDimmed = false;
    this.PreviousBrightness = 20;
    this.PreviousSystemVolume = 20;
    this.PreviousRingtoneVolume = 20;
    this.lastActivity = false;
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
    if (!appModel.dockMode) {
        systemModel.PreventDisplaySleep();
        systemModel.SetDisplayState("unlock"); //Unlock the screen
    }

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
    this.controller.window.onresize = this.calculateClockPosition.bind(this);
    document.addEventListener(Mojo.Event.tap, this.noticeActivity.bind(this));
    document.addEventListener(Mojo.Event.stageDeactivate, this.stageDeactivated);

    //Check for updates
    if (!appModel.UpdateCheckDone) {
        appModel.UpdateCheckDone = true;
        updaterModel.CheckForUpdate("One Night Stand", this.handleUpdateResponse.bind(this));
    }
};

MainAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    document.body.style.backgroundColor = "black";
    var stageController = Mojo.Controller.stageController;
    if (!appModel.DeviceType == "Touchpad")
        stageController.setWindowOrientation("left");
    else {
        stageController.setWindowOrientation("free");
    }
    //Apply preferences to Command bar
    var thisWidgetModel = this.controller.getWidgetSetup(Mojo.Menu.commandMenu).model;
    thisWidgetModel.items[1].items = [];
    thisWidgetModel.items[1].items.push({ label: 'Sleep Sound', iconPath: 'images/SleepSound.png', command: 'do-soundmenu' });
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
    this.controller.enableFullScreenMode(true);
    this.controller.get("clock").style.visibility = "hidden";
    this.controller.get("clock").style.color = appModel.AppSettingsCurrent["clockColor"];
    this.controller.get("clock").style.fontSize = (appModel.AppSettingsCurrent["clockSize"] + "px");
    this.updateClock(true);
    this.calculateClockPosition();
    setTimeout(this.calculateClockPosition.bind(this), 500);
    this.clockInt = setInterval(this.updateClock.bind(this), 6000);
    // Dim light bar
    systemModel.DimLightBar(true);
}

MainAssistant.prototype.calculateClockPosition = function() {
    Mojo.Log.info("Positioning clock...");

    var div = document.getElementById("clock");
    var screenHeight = window.innerHeight;
    var screenWidth = window.innerWidth;
    if (screenWidth < screenHeight) {
        div.style.webkitTransform = "scale(0.9)";
    } else {
        div.style.webkitTransform = "scale(1.0)";
    }
    div.style.top = (screenHeight / 2) - (div.clientHeight / 2);
    div.style.left = (screenWidth / 2) - (div.clientWidth / 2);
    Mojo.Log.info("Clock Top", div.style.top);
    Mojo.Log.info("Clock Left", div.style.left);
    this.controller.get("clock").style.visibility = "visible";
}

MainAssistant.prototype.handleClockTap = function() {
    clearTimeout(this.hideMenuTimeout);
    if (!this.menuOn) {
        this.hideMenuTimeout = setTimeout(this.toggleCommandMenu.bind(this), 8000);
    }
    this.toggleCommandMenu();
}

MainAssistant.prototype.updateClock = function(skipDim) {

    this.calculateClockPosition();

    var time = new Date();
    hour = time.getHours();
    min = time.getMinutes();
    sec = time.getSeconds();

    this.confirmDimSettings(hour, min);

    if (hour > 12 && !appModel.AppSettingsCurrent["use24HourTime"])
        hour = hour - 12;
    if (hour == 0 && !appModel.AppSettingsCurrent["use24HourTime"])
        hour = 12;
    min = this.confirmTime(min);
    sec = this.confirmTime(sec);
    this.controller.get("clock").innerHTML = hour + ":" + min;

    if (this.menuOn && this.lastActivity) {
        if ((Date.now() - this.lastActivity) > 120000) {
            Mojo.Log.warn("Forcing command menu off");
            this.toggleCommandMenu(false);
        }
    }

};

MainAssistant.prototype.confirmTime = function(str) {
    if (parseInt(str) < 10) {
        return "0" + str;
    } else {
        return str;
    }
};

MainAssistant.prototype.confirmDimSettings = function(hour, min) {
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
    } else {
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
            case 'do-soundmenu':
                {
                    Mojo.Log.warn("target " + event.target + ", srcElement " + event.srcElement + ", original target " + event.originalEvent.target);
                    var source = event.target || event.srcElement || event.originalEvent.target;
                    var popupMenuItems = [];
                    popupMenuItems.push({ label: 'Rain Storm', command: 'do-playsound-rainstorm' });
                    popupMenuItems.push({ label: 'Ocean Waves', command: 'do-playsound-oceanwaves' });
                    popupMenuItems.push({ label: 'White Noise', command: 'do-playsound-whitenoise' });
                    popupMenuItems.push({ label: 'Stop All Sound', command: 'do-stopsound' });
                    this.controller.popupSubmenu({
                        onChoose: this.handlePopupChoose.bind(this),
                        placeNear: source,
                        items: popupMenuItems
                    });
                    break;
                }
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
                    stageController.pushScene({ transition: Mojo.Transition.crossFade, name: "lamp", disableSceneScroller: true });
                    break;
                }
        }
    }
    Mojo.Log.info("current scene: " + currentScene.sceneName);
};

MainAssistant.prototype.handlePopupChoose = function(command) {
    this.stopAudio();
    if (command) {
        Mojo.Log.info("Popup choice was: " + command);
        if (command.indexOf("do-playsound-") != -1) {
            var sound = command.replace("do-playsound-", "");
            sound = "sounds/" + sound + ".mp3";
            Mojo.Log.warn("Requested sleep sound is: " + sound);
            this.playAudio(sound);
        }
    }
}

MainAssistant.prototype.handleUpdateResponse = function(responseObj) {
    if (responseObj && responseObj.updateFound) {
        updaterModel.PromptUserForUpdate(function(response) {
            if (response)
                updaterModel.InstallUpdate();
        }.bind(this));
    }
}

MainAssistant.prototype.noticeActivity = function() {
    this.lastActivity = Date.now();
}

MainAssistant.prototype.playAudio = function(soundPath) {
    var audioPlayer = this.controller.get("audioPlayer");
    if (soundPath) {
        Mojo.Log.info("Trying to play audio: " + soundPath);
        audioPlayer.src = soundPath;
        audioPlayer.load();
        //TODO: It would be nice to have a choice in how long something loops
        if (appModel.AppSettingsCurrent["loopSleepSound"] && appModel.AppSettingsCurrent["loopSleepSound"] == "infinite") {
            Mojo.Log.info("Looping sleep sound infinitely");
            audioPlayer.loop = true;
        } else {
            Mojo.Log.info("Not looping sleep sound");
            audioPlayer.loop = false;
        }
    }
    audioPlayer.play();
}

MainAssistant.prototype.stopAudio = function() {
    var audioPlayer = this.controller.get("audioPlayer");
    audioPlayer.pause();
}

MainAssistant.prototype.stageDeactivated = function() {
    if (appModel.dockMode)
        appModel.ExhibitionStart = true;
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
        try {
            systemModel.AllowDisplaySleep(); //This one fails on exit, but that's ok cause the OS takes care of it
        } catch (ex) {
            //oh well
        }
    }
    // Dim light bar
    systemModel.DimLightBar(false);
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};