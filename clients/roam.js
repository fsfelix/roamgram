const RoamResearchPrivateApi = require("roam-research-private-api");

class RoamApi extends RoamResearchPrivateApi {
  async appendBlock(text, order = 0, uid) {
    const result = await this.page.evaluate(
      (text, order, uid) => {
        if (!window.roamAlphaAPI) {
          return Promise.reject("No Roam API detected");
        }
        const result = window.roamAlphaAPI.createBlock({
          location: { "parent-uid": uid, order },
          block: { string: text },
        });
        return Promise.resolve(result);
      },
      text,
      order,
      uid
    );
    // Let's give time to sync.
    await this.page.waitForTimeout(1000);
    return result;
  }
}

module.exports = RoamApi