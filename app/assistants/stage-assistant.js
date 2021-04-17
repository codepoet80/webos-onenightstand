/*
Handle launches and the app menu here
*/

function StageAssistant() {
    /* this is the creator function for your stage assistant object */
}

StageAssistant.prototype.setup = function() {
    Mojo.Log.info("Stage assistant created!");
    this.controller.pushScene({ name: "main", disableSceneScroller: true });
    this.controller.setWindowOrientation("free");
};