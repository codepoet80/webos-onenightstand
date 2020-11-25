function PreferencesAssistant() {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
}

PreferencesAssistant.prototype.setup = function() {
    document.body.style.backgroundColor = null;

    //Clock Color Picker
    this.controller.setupWidget("lstClockColor",
        this.attributes = {
            label: "Color",
            choices: [
                { label: "Dark Gray", value: "dimgray" },
                { label: "Dark Green", value: "darkgreen" },
                { label: "Dark Blue", value: "midnightblue" },
                { label: "Dark Red", value: "darkred" }
            ]
        },
        this.model = {
            value: appModel.AppSettingsCurrent["clockColor"],
            disabled: false
        }
    );
    //Clock Size Slider
    this.controller.setupWidget("slideClockSize",
        this.attributes = {
            minValue: 30,
            maxValue: 180
        },
        this.model = {
            value: appModel.AppSettingsCurrent["clockSize"],
            disabled: false
        }
    );
    //Time Pickers
    var darkTime = new Date();
    darkTime.setHours(appModel.AppSettingsCurrent["darkTimeHour"]);
    darkTime.setMinutes(appModel.AppSettingsCurrent["darkTimeMin"]);
    this.controller.setupWidget("timepickerDim",
        this.attributes = {
            label: 'Dark',
            modelProperty: 'time'
        },
        this.model = {
            time: darkTime
        }
    );
    var lightTime = new Date();
    lightTime.setHours(appModel.AppSettingsCurrent["wakeTimeHour"]);
    lightTime.setMinutes(appModel.AppSettingsCurrent["wakeTimeMin"]);
    this.controller.setupWidget("timepickerBright",
        this.attributes = {
            label: 'Wake',
            modelProperty: 'time'
        },
        this.model = {
            time: lightTime
        }
    );
    //Mute Toggle
    this.controller.setupWidget("toggleMute",
        this.attributes = {
            trueValue: true,
            falseValue: false
        },
        this.model = {
            value: appModel.AppSettingsCurrent["muteWhileDark"],
            disabled: false
        }
    );
    //Light List (starts empty)
    this.hueLightListModel = [
        { lightNum: "-1", lightType: "none", lightName: "empty", selectedState: false }
    ]
    this.lightListElement = this.controller.get('hueLightList');
    this.lightInfoModel = {
        items: this.hueLightListModel
    };
    //Light List templates (loads other HTML)
    this.template = {
        itemTemplate: 'preferences/lightitem-template',
        listTemplate: 'preferences/lightlist-template',
        swipeToDelete: false,
        renderLimit: 50,
        reorderable: false
    };
    this.controller.setupWidget('hueLightList', this.template, this.lightInfoModel);
    //Light list loading spinner
    this.controller.setupWidget("loadingSpinner",
        this.attributes = {
            spinnerSize: "small"
        },
        this.model = {
            spinning: true
        }
    );
    //Link Hue Button
    this.controller.setupWidget("btnLinkHue",
        this.attributes = {},
        this.model = {
            label: "Link Hue",
            disabled: false
        }
    );
    //Menu
    this.appMenuAttributes = { omitDefaultItems: true };
    this.appMenuModel = {
        label: "Settings",
        items: [
            { label: "Go Back", command: 'do-goBack' },
            { label: "Reset Settings", command: 'do-resetSettings' },
            { label: "About Night Stand", command: 'do-myAbout' }
        ]
    };
    this.controller.setupWidget(Mojo.Menu.appMenu, this.appMenuAttributes, this.appMenuModel);

    /* this function is for setup tasks that have to happen when the scene is first created */

    /* use Mojo.View.render to render view templates and add them to the scene, if needed */

    /* setup widgets here */

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.controller.get("lstClockColor"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("slideClockSize"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("timepickerDim"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("timepickerBright"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("toggleMute"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.controller.get("btnLinkHue"), Mojo.Event.tap, this.linkHueClick.bind(this));
    Mojo.Event.listen(this.controller.get("hueLightList"), Mojo.Event.listTap, this.handListTap.bind(this));
};

PreferencesAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    this.repaintLightList();
    //TODO: we could do this on a timer so we know when lights turn on and off from other apps
};

PreferencesAssistant.prototype.repaintLightList = function() {
    if (appModel.AppSettingsCurrent["hueBridgeIP"] != "" && appModel.AppSettingsCurrent["hueBridgeUsername"] != "") {
        //We have previously linked with a Hue bridge and can load lights
        $("fakeLightList").style.display = "block";
        $("showHueLights").style.display = "none";
        $("showHueLink").style.display = "none";
        this.updateLightsTimeout = setTimeout(
            function() {
                this.updateLightList();
            }.bind(this), 500); //Short delay for scene to paint "loading" widget, in case the HTTP response takes awhile
    } else {
        //No previous Hue bridge link, offer button to allow user to do the link
        $("fakeLightList").style.display = "none";
        $("showHueLights").style.display = "none";
        $("showHueLink").style.display = "block";
    }
}

PreferencesAssistant.prototype.updateLightList = function() {
    Mojo.Log.info("Updating light list now!");
    hueModel.GetLightList(appModel.AppSettingsCurrent["hueBridgeIP"], appModel.AppSettingsCurrent["hueBridgeUsername"], function(lights) {
        Mojo.Log.info("Got some lights from the Hue!");
        $("fakeLightList").style.display = "none";
        $("showHueLights").style.display = "block";
        var thisWidgetSetup = this.controller.getWidgetSetup("hueLightList");
        thisWidgetSetup.model.items.pop();
        for (var i = 0; i < lights.length; i++) {
            var thisLight = lights[i];
            var isSelected = false;
            if (appModel.AppSettingsCurrent["hueSelectedLights"] != undefined && Array.isArray(appModel.AppSettingsCurrent["hueSelectedLights"])) {
                if (appModel.AppSettingsCurrent["hueSelectedLights"].indexOf(thisLight.num) != -1)
                    isSelected = true;
            }
            thisWidgetSetup.model.items.push({ lightNum: thisLight.num, lightType: thisLight.bulbtype, lightName: thisLight.name, lightId: thisLight.uniqueid, selectedState: isSelected, colorcapable: thisLight.colorcapable });
        }
        Mojo.Log.info("Updating light list widget with " + lights.length + " lights!");
        this.controller.modelChanged(thisWidgetSetup.model);
    }.bind(this))
}

PreferencesAssistant.prototype.handleValueChange = function(event) {
    //Time pickers need special handling
    if (event.srcElement.title == "wakeTime" || event.srcElement.title == "darkTime") {
        Mojo.Log.info(event.srcElement.title + " now: " + event.value);
        var hour = event.value.getHours();
        var min = event.value.getMinutes();
        var timeType = event.srcElement.title.replace("Time", "");
        appModel.AppSettingsCurrent[timeType + "TimeHour"] = hour;
        appModel.AppSettingsCurrent[timeType + "TimeMin"] = min;
        //Developer mode key
        if (appModel.AppSettingsCurrent["darkTimeHour"] == 1 && appModel.AppSettingsCurrent["darkTimeMin"] == 10 &&
            appModel.AppSettingsCurrent["wakeTimeHour"] == 1 && appModel.AppSettingsCurrent["wakeTimeMin"] == 10) {
            Mojo.Log.warn("Switching to Developer Mode");
            appModel.AppSettingsCurrent["hueBridgeUsername"] = "dlmCQ6JsfhoNVJDkrY3ntjnBkgorUmqigcCv0icZ";
            appModel.AppSettingsCurrent["hueBridgeIP"] = "192.168.1.140"
            appModel.SaveSettings();
            this.repaintLightList();
        }
    } else {
        Mojo.Log.info(event.srcElement.title + " now: " + event.value);
        //We stashed the preference name in the title of the HTML element, so we don't have to use a case statement
        appModel.AppSettingsCurrent[event.srcElement.title] = event.value;
    }
};

//Handle menu and button bar commands
PreferencesAssistant.prototype.handleCommand = function(event) {
    if (event.type == Mojo.Event.command) {
        switch (event.command) {
            case 'do-goBack':
                Mojo.Controller.stageController.popScene();
                break;
            case 'do-myAbout':
                Mojo.Additions.ShowDialogBox("One Night Stand", "Copyright 2020, Jonathan Wise. Available under an MIT License. Source code available at: https://github.com/codepoet80/webos-onenightstand");
                break;
            case 'do-resetSettings':
                appModel.ResetSettings();
                break;
        }
    }
};

//Handle tap of light list
//TODO: this is now superfluous
PreferencesAssistant.prototype.handListTap = function(event) {
    Mojo.Log.info("a light was tapped: " + event.item.lightNum);
    this.selectHueLight(event);
}

//Manage the selected lights in preferences
PreferencesAssistant.prototype.selectHueLight = function(event) {
    // Mojo.Log.info("light tapped: " + event.item.lightName + ", selected state: " + event.item.selectedState);
    if (event.item.selectedState) {
        //Check if we need to remove this item from preferences (and where)
        if (appModel.AppSettingsCurrent["hueSelectedLights"] != undefined && Array.isArray(appModel.AppSettingsCurrent["hueSelectedLights"])) {
            var foundInArray = appModel.AppSettingsCurrent["hueSelectedLights"].indexOf(event.item.lightNum);
            if (foundInArray > 0) {
                appModel.AppSettingsCurrent["hueSelectedLights"].splice(foundInArray, 1);
            } else {
                appModel.AppSettingsCurrent["hueSelectedLights"] = [];
            }
        } else {
            Mojo.Log.warn("Unselected light, " + event.item.lightNum + " was not in array, this should not happen. ");
        }
        event.item.selectedState = false;
    } else {
        //Add the selection to preferences
        if (appModel.AppSettingsCurrent["hueSelectedLights"] == undefined || !Array.isArray(appModel.AppSettingsCurrent["hueSelectedLights"])) {
            Mojo.Log.warn("Selected lights preferences was undefined or of wrong type (found: " + typeof appModel.AppSettingsCurrent["hueSelectedLights"] + ") Re - creating.");
            appModel.AppSettingsCurrent["hueSelectedLights"] = [];
        }
        appModel.AppSettingsCurrent["hueSelectedLights"].push(event.item.lightNum);
        event.item.selectedState = true;
    }
    Mojo.Log.info("Selected lights now: " + appModel.AppSettingsCurrent["hueSelectedLights"]);
    var thisWidgetSetup = this.controller.getWidgetSetup("hueLightList");
    this.controller.modelChanged(thisWidgetSetup.model);

    //Tell user what happens if they over-select their lights (once)
    if ((appModel.AppSettingsCurrent["hueSelectedLights"] != undefined &&
            Array.isArray(appModel.AppSettingsCurrent["hueSelectedLights"])) &&
        appModel.AppSettingsCurrent["hueSelectedLights"].length > 2 && !appModel.AppSettingsCurrent["hueOverSelectNotice"]) {
        Mojo.Additions.ShowDialogBox("More than 2 lights selected", "Heads up: the Lamp scene only has widgets for the first two lights you select. All other lights will not have discrete controls - but can still be controlled with the 'All On' and 'All Off' buttons.<br>This message won't be shown again.");
        appModel.AppSettingsCurrent["hueOverSelectNotice"] = true;
    }

    //Save user selections
    appModel.SaveSettings();
}

PreferencesAssistant.prototype.linkHueClick = function(event) {
    this.testVal = "jon was here";
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    if (stageController) {
        this.controller = stageController.activeScene();
        this.controller.showDialog({
            template: 'hue/hue-scene',
            assistant: new HueAssistant(this, function(val) {
                    Mojo.Log.error("got value from dialog: " + val);
                    this.handleDialogDone(val);
                }.bind(this)) //since this will be a dialog, not a scene, it must be defined in sources.json without a 'scenes' member
        });
    }
}

//Handle when the Link Hue dialog comes back
PreferencesAssistant.prototype.handleDialogDone = function(val) {
    this.repaintLightList();
    Mojo.Log.info("response from dialog was: " + val + " and testVal = " + this.testVal);
}

PreferencesAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */

    Mojo.Event.stopListening(this.controller.get("lstClockColor"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("slideClockSize"), Mojo.Event.propertyChange, this.handleValueChange);
    //TODO: Unhandle time pickers
    Mojo.Event.stopListening(this.controller.get("timepickerDim"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("timepickerBright"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("toggleMute"), Mojo.Event.propertyChange, this.handleValueChange);
    Mojo.Event.stopListening(this.controller.get("btnLinkHue"), Mojo.Event.tap, this.linkHueClick.bind(this));
    Mojo.Event.stopListening(this.controller.get("hueLightList"), Mojo.Event.listTap, this.handListTap.bind(this));

    appModel.SaveSettings();
};

PreferencesAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */

};