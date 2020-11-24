/*
Hue Model
 Version 1.0
 Created: 2020
 Author: Jonathan Wise
 License: MIT
 Description: A generic and re-usable model for accessing Philips Hue bridge capabilities
*/

var HueModel = function() {

};

//Returns a username if successfully linked, "await-link" if wait for the link button to be pressed
//  or the full HTTP response text in all other cases (eg: errors)
HueModel.prototype.LinkWithHue = function(bridgeip, appid, callback) {
    this.bridgeURL = "http://" + bridgeip + "/api";
    Mojo.Log.info("Registering with Hue at: " + this.bridgeURL);
    this.retVal = "";

    // set scope for xmlhttp anonymous function callback
    if (callback)
        this.callBack = callback.bind(this);

    //Even though webOS has an Ajax.Request method, it does not support sending JSON in put parameters
    //	So we'll fall back to the good old browser method
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("POST", this.bridgeURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify({ "devicetype": appid }));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Hue responded: " + xmlhttp.responseText);
            if (xmlhttp.responseText && xmlhttp.responseText.indexOf("link button not pressed") != -1) {
                Mojo.Log.info("Hue responded that it is awaiting the link button press");
                this.retVal = "await-link";
            } else if (xmlhttp.responseText && xmlhttp.responseText.indexOf("username") != -1) {
                var responseObj = JSON.parse(xmlhttp.responseText);
                Mojo.Log.info("Hue responded with new username: " + responseObj[0].success.username)
                this.retVal = responseObj[0].success.username;
            } else {
                Mojo.Log.error("Hue responded with error: " + xmlhttp.responseText);
                this.retVal = xmlhttp.responseText;
            }
            if (this.callBack)
                this.callBack(this.retVal);
        }
    }.bind(this);
}

//Returns an array of Simple Light objects
HueModel.prototype.GetLightList = function(bridgeip, userid, callback) {
    this.bridgeURL = "http://" + bridgeip + "/api/" + userid + "/lights/";
    Mojo.Log.info("Getting Hue Lights with URL " + this.bridgeURL);
    this.retVal = "";

    // set scope for xmlhttp anonymous function callback
    if (callback)
        this.callBack = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", this.bridgeURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            //Mojo.Log.info("Hue responded: " + xmlhttp.responseText);
            //crude check to make sure we got a usable response
            if (xmlhttp.responseText.indexOf("state") != -1) {
                var lightArray = [];
                var responseObj = JSON.parse(xmlhttp.responseText);
                for (var lightKey in responseObj) {
                    if (typeof lightKey != "undefined") {
                        var thisLight = responseObj[lightKey];
                        Mojo.Log.info(JSON.stringify(thisLight));
                        //TODO: Wouldn't it be cool if the light object had on/off methods directly in it? Binding 'this' will be hell though...
                        var simpleLight = {
                            num: lightKey,
                            on: thisLight.state.on,
                            brightness: thisLight.state.bri,
                            reachable: thisLight.state.reachable,
                            bulbtype: thisLight.config.archetype,
                            colorcapable: false,
                            name: thisLight.name,
                            uniqueid: thisLight.uniqueid
                        };
                        //HACK: This is a crude approach to check if the light seems to support color
                        Mojo.Log.info("color status: " + thisLight.type.toLowerCase());
                        if (thisLight.type.toLowerCase().indexOf("color") != -1)
                            simpleLight.colorcapable = true;
                        lightArray.push(simpleLight);
                    }
                };
                this.retVal = lightArray;
            } else {
                Mojo.Log.warn("Hue response did not appear to contain light states!");
                this.retVal = xmlhttp.responseText;
            }
            if (this.callBack)
                this.callBack(this.retVal);
        }
    }.bind(this);
}

//Returns a Simple Light object
HueModel.prototype.GetLight = function(bridgeip, userid, light, callback) {
    this.bridgeURL = "http://" + bridgeip + "/api/" + userid + "/lights/";
    Mojo.Log.info("Getting Hue Light with URL " + this.bridgeURL);
    this.retVal = "";

    // set scope for xmlhttp anonymous function callback
    if (callback)
        this.callBack = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", this.bridgeURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Hue responded: " + xmlhttp.responseText);
            //crude check to make sure we got a usable response
            if (xmlhttp.responseText.indexOf("state") != -1) {
                var responseObj = JSON.parse(xmlhttp.responseText);
                for (var lightKey in responseObj) {
                    if (typeof this.prototype[lightKey] != "undefined") {
                        var thisLight = object[key];
                        //TODO: Wouldn't it be cool if the light object had on/off methods directly in it? Binding 'this' will be hell though...
                        var simpleLight = {
                            num: lightKey,
                            on: thisLight.state.on,
                            brightness: thisLight.state.bri,
                            reachable: thisLight.state.reachable,
                            bulbtype: thisLight.config.archetype,
                            colorcapable: false,
                            name: thisLight.name,
                            uniqueid: thisLight.uniqueid
                        };
                        //HACK: This is a crude approach to check if the light seems to support color
                        Mojo.Log.info("color status: " + thisLight.type.toLowerCase());
                        if (thisLight.type.toLowerCase().indexOf("color") != -1)
                            simpleLight.colorcapable = true;
                        //This query returns the object for only the queried light
                        //  To support multiple types of queries, we have to detect the query type
                        //  And compare accordingly.
                        if (typeof light == Number) {
                            if (simpleLight.num == light)
                                this.retVal = thisLight;
                        }
                        if (typeof light == String) {
                            if (simpleLight.uniqueid == light)
                                this.retVal = thisLight;
                        }
                        if (typeof light == Object) {
                            if (simpleLight.uniqueid == light.uniqueid)
                                this.retVal = thisLight
                        }
                    }
                };
            } else {
                Mojo.Log.warn("Hue response did not appear to contain light states!");
                this.retVal = xmlhttp.responseText;
            }
            if (this.callBack)
                this.callBack(this.retVal);
        }
    }.bind(this);
}

//Returns a boolean indicating success
HueModel.prototype.TurnLightOff = function(bridgeip, userid, light, callback) {
    //Handle an object being passed in, instead of a light number
    //TODO: for consistency we should also handle passing in a light uniqueid
    if (typeof light == Object)
        light = light.num;

    this.bridgeURL = "http://" + bridgeip + "/api/" + userid + "/lights/" + light + "/state";
    Mojo.Log.info("Turning OFF Hue light: " + light + " with URL " + this.bridgeURL);
    this.retVal = "";

    // set scope for xmlhttp anonymous function callback
    if (callback)
        this.callBack = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("PUT", this.bridgeURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify({ "on": false }));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Hue responded: " + xmlhttp.responseText);
            if (xmlhttp.responseText == "" || xmlhttp.responseText.indexOf("error") != -1) {
                Mojo.Log.error("Hue response indicated an error!");
                this.retVal = false;
            } else {
                this.retVal = true;
            }
            if (this.callBack)
                this.callBack(this.retVal);
        }
    }.bind(this);
}

//Returns a boolean indicating success
HueModel.prototype.TurnLightOn = function(bridgeip, userid, light, callback) {
    //Handle an object being passed in, instead of a light number
    //TODO: for consistency we should also handle passing in a light uniqueid
    if (typeof light == Object)
        light = light.num;

    this.bridgeURL = "http://" + bridgeip + "/api/" + userid + "/lights/" + light + "/state";
    Mojo.Log.info("Turning ON Hue light: " + light + " with URL " + this.bridgeURL);
    this.retVal = "";

    // set scope for xmlhttp anonymous function callback
    if (callback)
        this.callBack = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("PUT", this.bridgeURL);

    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify({ "on": true }));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Hue responded: " + xmlhttp.responseText);
            if (xmlhttp.responseText == "" || xmlhttp.responseText.indexOf("error") != -1) {
                Mojo.Log.error("Hue response indicated an error!");
                this.retVal = false;
            } else {
                this.retVal = true;
            }
            if (this.callBack)
                this.callBack(this.retVal);
        }
    }.bind(this);
}

//Returns a boolean indicating success
HueModel.prototype.SetLightBrightness = function(bridgeip, userid, light, percentBright, forceOn, callback) {
    //Handle an object being passed in, instead of a light number
    //TODO: for consistency we should also handle passing in a light uniqueid
    if (typeof light == Object)
        light = light.num;

    this.bridgeURL = "http://" + bridgeip + "/api/" + userid + "/lights/" + light + "/state";
    Mojo.Log.info("Setting brightness on Hue light: " + light + " with URL " + this.bridgeURL);
    this.retVal = "";

    // set scope for xmlhttp anonymous function callback
    if (callback)
        this.callBack = callback.bind(this);

    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("PUT", this.bridgeURL);
    xmlhttp.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    xmlhttp.send(JSON.stringify({ "bri": percentBright }));
    if (forceOn)
        xmlhttp.send(JSON.stringify({ "on": true }));
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == XMLHttpRequest.DONE) {
            Mojo.Log.info("Hue responded: " + xmlhttp.responseText);
            if (xmlhttp.responseText == "" || xmlhttp.responseText.indexOf("error") != -1) {
                Mojo.Log.error("Hue response indicated an error!");
                this.retVal = false;
            } else {
                this.retVal = true;
            }
            if (this.callBack)
                this.callBack(this.retVal);
        }
    }.bind(this);
}