function MainAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
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
                    { label: $L('Settings'), iconPath: 'images/Lightbulb.png', command: 'do-lamps' }
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
    this.menuOn = false;

    // Remember and set display settings
    systemModel.GetDisplayState(function(response) {
        if (response.maximumBrightness != null)
            appModel.PreviousBrightness = response.maximumBrightness;
        Mojo.Log.info("Remembering previous brightness as: " + appModel.PreviousBrightness);
    });
    systemModel.GetSystemVolume(function(response) {
        if (response.returnValue) {
            appModel.PreviousSystemVolume = response.volume;
        }
        Mojo.Log.info("Remembering previous system volume as: " + appModel.PreviousSystemVolume);
    });
    systemModel.GetRingtoneVolume(function(response) {
        if (response.returnValue) {
            appModel.PreviousRingtoneVolume.value = response.volume;
        }
        Mojo.Log.info("Remembering previous ringtone volume as: " + appModel.PreviousRingtoneVolume);
    });
    systemModel.PreventDisplaySleep();

    /* add event handlers to listen to events from widgets */
    this.controller.listen("clock", Mojo.Event.tap, this.handleClockTap.bind(this));

    Mojo.Log.info("== height: " + window.screen.height);
    Mojo.Log.info("== width:  " + window.screen.width);
};

MainAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    document.body.style.backgroundColor = "black";
    var stageController = Mojo.Controller.stageController;
    stageController.setWindowOrientation("left");

    // Setup the clock face
    this.controller.get("clock").style.color = appModel.AppSettingsCurrent["clockColor"];
    this.controller.get("clock").style.fontSize = (appModel.AppSettingsCurrent["clockSize"] + "px");
    this.controller.get("clock").style.marginTop = ((window.screen.width) - (appModel.AppSettingsCurrent["clockSize"] * 2.2) + "px");
    this.showClock();
    this.clockInt = setInterval(this.showClock.bind(this), 6000);

    systemModel.PreventDisplaySleep();

    //TODO: this only happens if we're within the time ranges
    //TODO: also need to change if we move within or without the time ranges later
    systemModel.SetSystemBrightness(1);
    if (appModel.AppSettingsCurrent["muteWhileDark"]) {
        systemModel.SetSystemVolume(0);
        systemModel.SetRingtoneVolume(0);
    }
};

MainAssistant.prototype.handleClockTap = function() {
    clearTimeout(this.hideMenuTimeout);
    if (!this.menuOn) {
        this.hideMenuTimeout = setTimeout(this.toggleCommandMenu.bind(this), 8000);
    }
    this.toggleCommandMenu();
}

MainAssistant.prototype.showClock = function() {
    //Mojo.Log.info("Updating time");

    var time = new Date();
    hour = time.getHours();
    min = time.getMinutes();
    sec = time.getSeconds();
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
                    clearTimeout(this.hideMenuTimeout);
                    var stageController = Mojo.Controller.stageController;
                    stageController.pushScene({ name: "preferences", disableSceneScroller: false });
                    stageController.setWindowOrientation("free");
                    break;
                }
            case 'do-lamps':
                {
                    Mojo.Additions.ShowDialogBox("Night Stand", "This is where I would show the lamps scene!");
                    break;
                }
        }
    }
    Mojo.Log.info("current scene: " + currentScene.sceneName);
};

MainAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("clock"), Mojo.Event.tap, this.handleClockTap.bind(this));

    systemModel.SetSystemBrightness(appModel.PreviousBrightness);
    systemModel.SetSystemVolume(appModel.PreviousSystemVolume);
    systemModel.SetRingtoneVolume(appModel.PreviousRingtoneVolume);
    systemModel.AllowDisplaySleep(); //This one fails on exit, but that's ok cause the OS takes care of it
};

MainAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};