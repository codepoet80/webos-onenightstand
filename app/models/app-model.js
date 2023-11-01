/*
App Model
 Version 0.4
 Created: 2018
 Author: Jon W
 License: MIT
 Description: Common functions for webOS apps, particularly for managing persisted options in cookies
*/

var AppModel = function() {
    //Define your default scene (needed for settings management)
    this.DefaultScene = "main";

    //Define your app-wide, non-persisted settings here
    this.Lamps = [];
    this.DisplayTimeout = 25;
    this.DeviceType = "Pre";
    this.UpdateCheckDone = false;
    this.dockMode = false;
    this.BaseDateString = "August 25, 2001 ";

    //Define your app preferences (to be saved by OS)
    this.AppSettingsCurrent = null;
    this.AppSettingsDefaults = {
        showAlarmButton: false,
        dimLevel: 1,
        use24HourTime: false,
        clockColor: "dimgray",
        clockSize: 130,
        clockMargin: 12,
        dailyLaunchEnabled: false,
        launchTime: this.BaseDateString + "09:00:00",
        darkTimeHour: 21,
        darkTimeMin: 30,
        wakeTimeHour: 6,
        wakeTimeMin: 30,
        muteWhileDark: true,
        showSoundsButton: true,
        loopSleepSound: 1,
        hueBridgeIP: "",
        hueBridgeUsername: "",
        hueSelectedLights: [],
        hueOverSelectNotice: false
    };
}

//You probably don't need to change the below functions since they all work against the Cookie defaults you defined above.
//  LoadSettings: call when your app starts, or you want to load previously persisted options.
//  SaveSettings: call any time you want to persist an option.
//  ResetSettings: call if you want to forget stored settings and return to defaults. Your default scene will be popped and re-pushed.
AppModel.prototype.LoadSettings = function(safe) {
    this.AppSettingsCurrent = this.AppSettingsDefaults;
    var loadSuccess = false;
    var settingsCookie = new Mojo.Model.Cookie("settings");

    try {
        appSettings = settingsCookie.get();
        
        //Load defaults for new features
        if (appSettings && !appSettings["dailyLaunchEnabled"])
            appSettings["dailyLaunchEnabled"] = this.AppSettingsDefaults.dailyLaunchEnabled;
        if (appSettings && !appSettings["launchTime"])
            appSettings["launchTime"] = this.AppSettingsDefaults.launchTime;
        
        //Make sure all other settings are valid
        if ((typeof appSettings == "undefined" || appSettings == null) || (safe && !this.checkSettingsValid(appSettings))) {
            Mojo.Log.warn("** Using first run default settings");
        } else {
            Mojo.Log.info("** Using cookie settings!");
            this.loadCookieIntoCurrent(appSettings);
            loadSuccess = true;
        }
    } catch (ex) {
        settingsCookie.put(null);
        Mojo.Log.error("** Settings cookie were corrupt and have been purged!");
        Mojo.Log.error(ex);
    }
    return loadSuccess;
}

AppModel.prototype.loadCookieIntoCurrent = function(cookieSettings) {
    for (var key in this.AppSettingsDefaults) {
        if (typeof cookieSettings[key] !== 'undefined')
            appModel.AppSettingsCurrent[key] = cookieSettings[key]
        else 
            appModel.AppSettingsCurrent[key] = appModel.AppSettingsDefaults[key];
    }
}

AppModel.prototype.checkSettingsValid = function(loadedSettings) {
    var retValue = true;
    for (var key in this.AppSettingsDefaults) {
        if (typeof loadedSettings[key] === undefined || loadedSettings[key] == null) {
            Mojo.Log.warn("** An expected saved setting, " + key + ", was null or undefined.");
            retValue = false;
        }
        if (typeof loadedSettings[key] !== typeof this.AppSettingsDefaults[key]) {
            Mojo.Log.warn("** A saved setting, " + key + ", was of type " + typeof(loadedSettings[key]) + " but expected type " + typeof(this.AppSettingsDefaults[key]));
            retValue = false;
        }
        if (typeof this.AppSettingsDefaults[key] === "string" && this.AppSettingsDefaults[key].indexOf(this.BaseDateString) != -1 && loadedSettings[key].indexOf(this.BaseDateString)) {
            Mojo.Log.warn("** A saved setting could not be compared to an expected date value.");
            retValue = false;
        }
        if (typeof this.AppSettingsDefaults[key] === "string" && (this.AppSettingsDefaults[key] == "false" || this.AppSettingsDefaults[key] == "true")) {
            if (loadedSettings[key] != "false" && loadedSettings[key] != "true") {
                Mojo.Log.warn("** A saved setting did not have the expected boolean value.");
                retValue = false;
            }
        }
    }
    return retValue;
}

AppModel.prototype.SaveSettings = function() {
    var settingsCookie = new Mojo.Model.Cookie("settings");
    Mojo.Log.warn("Saving settings as: " + JSON.stringify(appModel.AppSettingsCurrent));
    settingsCookie.put(appModel.AppSettingsCurrent);
}

AppModel.prototype.ResetSettings = function() {
    Mojo.Log.warn("Trying to reset settings!");
    var settingsCookie = new Mojo.Model.Cookie("settings");
    settingsCookie.put(null);
    this.AppSettingsCurrent = this.AppSettingsDefaults;
    Mojo.Log.info("Settings have been reset");
    var stageController = Mojo.Controller.getAppController().getActiveStageController();
    stageController.swapScene(this.DefaultScene);
}

//This gnarly function actually sets an alarm. Depending on how far out the next alarm time is, we might need an absolute or relative alarm.
AppModel.prototype.manageAlarm = function (alarmName, alarmTime, alarmEnabled, forceAbsolute, bulk)
{
	var alarmSetResult = true;
	//Clear out the alarm every time
	if (systemModel.ClearSystemAlarm(alarmName))
		Mojo.Log.info("Cleared alarm: " + alarmName);
	else
		Mojo.Log.error("Could not clear alarm: " + alarmName);

	//If the alarm is on, set it again
	var alarmType = "absolute";
	if (alarmEnabled == "true" || alarmEnabled == true)
	{
		//now is the current datetime plus/minus a minute, since alarms aren't precise
		var now = new Date();
		var nowMax = new Date(now.setSeconds(now.getSeconds() + 90));
		var nowMin = new Date(now.setSeconds(now.getSeconds() - 90));

		//alarmTime: adjust theoretical alarm time to today
		alarmTime = new Date(adjustAlarmTimeToToday(alarmTime));

		//If the alarm is 1 min or less in the future, and not a currently active alarm
		if (alarmTime.getTime() > nowMin.getTime() && alarmTime.getTime() < nowMax.getTime())
		{
			if (forceAbsolute != true && forceAbsolute != alarmName)
			{
				alarmType = "relative";
				var relativeTime = (alarmTime.getTime() - now.getTime());				
				var hours = Math.floor(relativeTime / 3600000); //Find the hours
				relativeTime = (relativeTime - hours * 3600000); //Found the hours, so discard them and find the remaining minutes
				var minutes = Math.floor(relativeTime / 60000);
				relativeTime = (relativeTime - minutes * 60000); //Found the minutes, so discard them and find the remain seconds
				var seconds = Math.floor(relativeTime / 1000);
				relativeTime = padZeroes(hours) + ":" + padZeroes(minutes) + ":" + padZeroes(seconds) + ":00";

				Mojo.Log.warn("Setting Relative " + alarmName + " Alarm: " + relativeTime);
				alarmSetResult = systemModel.SetSystemAlarmRelative(alarmName, relativeTime);
				if (alarmSetResult && !bulk)
					Mojo.Controller.getAppController().showBanner("Next trigger: in seconds.", {source: 'notification'});
			}
			else
			{
				//Subtract another 30 seconds to ensure this alarm time is in the past, and fall through to absolute alarm setting
				alarmTime.setSeconds(alarmTime.getSeconds()-30);
			}
		}
		//If the alarm is in the past, move the date to tomorrow and set the time absolutely
		if (alarmTime.getTime() <= nowMin.getTime())
		{
			//Move the date to tomorrow
			var utcAlarm = new Date(alarmTime.getTime());
			utcAlarm.setDate(utcAlarm.getDate() + 1);
			var adjustedAlarmTime = new Date(alarmTime);
			utcAlarm = constructUTCAlarm(utcAlarm);
			Mojo.Log.warn("Setting Absolute " + alarmName + " Alarm for Tomorrow: " + adjustedAlarmTime.getHours() + ":" + padZeroes(adjustedAlarmTime.getMinutes()) + " (UTC: " + utcAlarm + ")");
			alarmSetResult = systemModel.SetSystemAlarmAbsolute(alarmName, utcAlarm);
			if (alarmSetResult && !bulk)
				Mojo.Controller.getAppController().showBanner("Next trigger: tomorrow.", {source: 'notification'});
		}
		//If the alarm is more than 1 min in the future, set the time absolutely
		if (alarmTime.getTime() >= nowMax.getTime())
		{
			var utcAlarm = constructUTCAlarm(alarmTime);
			Mojo.Log.warn("Setting Absolute " + alarmName + " Alarm for Today: " + alarmTime.getHours() + ":" + padZeroes(alarmTime.getMinutes()) + " (UTC: " + utcAlarm + ")");
            Mojo.Log.warn("Because " + alarmTime.getTime() + "!>=" + nowMax.getTime());
			alarmSetResult = systemModel.SetSystemAlarmAbsolute(alarmName, utcAlarm);
			if (alarmSetResult && !bulk)
				Mojo.Controller.getAppController().showBanner("Next trigger: later today.", {source: 'notification'});
		}
	}
	if (alarmSetResult)
		Mojo.Log.info(alarmType + " alarm set succeeded!");
	else
	{
		Mojo.Log.error(alarmType + " " + alarmName + " alarm set failed!")
		Mojo.Controller.getAppController().showBanner("Failed to set next trigger!", {source: 'notification'});
	}
	return alarmSetResult;
}

adjustAlarmTimeToToday = function (theoreticalAlarmTime)
{
	var today = new Date();
	var alarmAdjusted = new Date(theoreticalAlarmTime);
	alarmAdjusted.setYear(today.getFullYear());
	alarmAdjusted.setMonth(today.getMonth());
	alarmAdjusted.setDate(today.getDate());
	return alarmAdjusted;
}

constructUTCAlarm = function(useTime)
{
	var providedDate = new Date(useTime);
	var utcOffset = (providedDate.getTimezoneOffset() / 60);
	providedDate.setHours(providedDate.getHours() + utcOffset);
    var utcString = padZeroes(providedDate.getUTCMonth()+1) + "/" + padZeroes(providedDate.getDate()) + "/" + padZeroes(providedDate.getUTCFullYear());
    utcString += " " + padZeroes(providedDate.getHours()) + ":" + padZeroes(providedDate.getUTCMinutes()) + ":" + padZeroes(providedDate.getUTCSeconds());
	return utcString;
}

padZeroes = function(num) 
{ 
	return ((num>9)?"":"0")+num; 
}