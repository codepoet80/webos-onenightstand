function HueAssistant(sceneAssistant, doneCallBack) {
    this.doneCallBack = doneCallBack;
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    Mojo.Log.info("new Hue assistant exists");
    this.sceneAssistant = sceneAssistant; //dialog's do not have their own controller, so need access to the launching scene's controller
}

HueAssistant.prototype.setup = function(widget) {
    /* this function is for setup tasks that have to happen when the scene is first created */
    this.widget = widget;
    Mojo.Log.info("hue assistant setup");
    Mojo.Log.info("hue bridge value is: " + appModel.AppSettingsCurrent["hueBridgeIP"]);

    /* setup widgets here */
    this.sceneAssistant.controller.setupWidget("txtHueBridgeIP",
        this.attributes = {
            textFieldName: "ip",
            hintText: "IP address for Hue bridge...",
            property: 'value',
            multi: false,
            changeOnKeyPress: true,
            textReplacement: false,
            requiresEnterKey: false,
            focus: true
        },
        this.model = {
            value: appModel.AppSettingsCurrent["hueBridgeIP"],
            disabled: false
        }
    );
    this.sceneAssistant.controller.setupWidget("linkSpinner",
        this.attributes = {
            spinnerSize: "small"
        },
        this.model = {
            spinning: true
        }
    );
    this.sceneAssistant.controller.setupWidget("goButton", { type: Mojo.Widget.activityButton }, { label: "OK", disabled: false });
    this.sceneAssistant.controller.setupWidget("cancelButton", { type: Mojo.Widget.button }, { label: "Cancel", disabled: false });

    /* add event handlers to listen to events from widgets */
    Mojo.Event.listen(this.sceneAssistant.controller.get("txtHueBridgeIP"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    Mojo.Event.listen(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

HueAssistant.prototype.handleValueChange = function(event) {
    //We stash the preference name in the title of the HTML element, so we don't have to use a case statemtn
    //Mojo.Log.info(event.srcElement.title + " now: " + event.value);
};

HueAssistant.prototype.handleGoPress = function(event) {
    var checkIP = this.sceneAssistant.controller.get('txtHueBridgeIP').mojo.getValue();
    if (checkIP.length >= 8) {
        //Remember the address they entered
        appModel.AppSettingsCurrent["hueBridgeIP"] = checkIP;
        appModel.SaveSettings();

        //Update UI for this state
        $("linkInformation").style.display = "none";
        $("linkInstructions").style.display = "block";
        $("addressError").style.display = "none";
        $("linkError").style.display = "none";

        //Weird javascript work-around to make sure the function called on a timer can share our 'this'
        this.checkHueInt = setInterval(
            function() {
                this.registerWithHue(this.handleHueResponse.bind(this));
            }.bind(this), 4000);
        this.checkHueTimeout = setTimeout(
            function() {
                this.handleHueTimeout();
            }.bind(this), 31000);
    } else {
        //Tell user about the error and stop the spinning button
        $("addressError").style.display = "block";
        $("linkError").style.display = "none";
        $("linkInstructions").style.display = "none";
        this.sceneAssistant.controller.get('goButton').mojo.deactivate();
    }
}

HueAssistant.prototype.handleCancelPress = function(event) {
    this.doneCallBack("cancel");
    this.widget.mojo.close();
}

HueAssistant.prototype.handleHueTimeout = function(event) {
    Mojo.Log.info("Timeout waiting for good response from Hue.");
    clearInterval(this.checkHueInt);
    //Tell user about the error and stop the spinning button
    $("linkInformation").style.display = "block";
    $("linkInstructions").style.display = "none";
    $("linkError").style.display = "block";
    this.sceneAssistant.controller.get('goButton').mojo.deactivate();
}

HueAssistant.prototype.handleHueResponse = function(retVal) {
    //We got a usable response from the Hue!
    if (retVal != "await-link" && retVal != "error") {
        clearInterval(this.checkHueInt);
        clearTimeout(this.checkHueTimeout);
        //Remember the username the Hue gave us
        appModel.AppSettingsCurrent["hueBridgeUsername"] = retVal;
        appModel.SaveSettings();
        //Dismiss this dialog
        this.doneCallBack(retVal);
        this.widget.mojo.close();
    }
}

HueAssistant.prototype.registerWithHue = function(callback) {
    hueModel.LinkWithHue(appModel.AppSettingsCurrent["hueBridgeIP"], "webosnightstand", callback);
}

HueAssistant.prototype.activate = function(event) {
    Mojo.Log.info("hue assistant activated");
    /* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */

};

HueAssistant.prototype.deactivate = function(event) {
    Mojo.Log.info("hue assistant deactivated");
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("txtHueBridgeIP"), Mojo.Event.propertyChange, this.handleValueChange.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("goButton"), Mojo.Event.tap, this.handleGoPress.bind(this));
    Mojo.Event.stopListening(this.sceneAssistant.controller.get("cancelButton"), Mojo.Event.tap, this.handleCancelPress.bind(this));
};

HueAssistant.prototype.cleanup = function(event) {
    Mojo.Log.info("hue assistant cleaned up");
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
    clearInterval(this.checkHueInt);
    clearTimeout(this.checkHueTimeout);
};